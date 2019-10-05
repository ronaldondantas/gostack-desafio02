import * as Yup from "yup";
import { parseISO, isBefore } from "date-fns";
import { Op } from "sequelize";
import User from "../models/User";
import Meetup from "../models/Meetup";
import Enroll from "../models/Enroll";
import Notification from "../schemas/Notification";
import EnrollMail from "../jobs/EnrollMail";
import Queue from "../../lib/Queue";
import Mail from "../../lib/Mail";

class EnrollController {
  async index(req, res) {
    const enrolls = await Enroll.findAll({
      where: {
        user_id: req.userId
      },
      order: [["meetup", "datetime", "asc"]],
      include: {
        model: Meetup,
        as: "meetup",
        where: {
          datetime: {
            [Op.gte]: new Date()
          }
        }
      }
    });
    return res.json(enrolls);
  }

  async store(req, res) {
    const user = await User.findOne({
      where: { id: req.userId }
    });

    if (!user) {
      return res.status(400).json({ error: "User does not exists" });
    }

    const meetupId = Number(req.params.meetupId);

    let meetup = await Meetup.findByPk(meetupId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id"]
        }
      ]
    });

    if (!meetup) {
      return res.status(400).json({
        error: "Meetup is not exists."
      });
    }

    meetup = await Meetup.findOne({
      where: {
        id: meetupId,
        datetime: {
          [Op.gte]: new Date()
        }
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id"]
        }
      ]
    });

    if (!meetup) {
      return res.status(400).json({
        error: "Meetup was happened."
      });
    }

    if (req.userId === meetup.user_id) {
      return res.status(400).json({
        error: "User is administrator of this meetup. Enroll denied."
      });
    }

    const enrolls = await Enroll.findAll({
      where: {
        user_id: req.userId
      }
    });

    const userAlreadyEnrolled =
      enrolls.filter(enroll => enroll.meetup_id === meetupId).length > 0;

    if (userAlreadyEnrolled) {
      return res.status(400).json({
        error: "User is already enrolled on this meetup."
      });
    }

    const enrollsFromUser = await Enroll.findAll({
      where: { user_id: req.userId }
    });

    const meetupIdsFromUser = enrollsFromUser.map(enroll => enroll.meetup_id);

    for (let i = 0; i < meetupIdsFromUser.length; ++i) {
      const meetupIdFromUser = meetupIdsFromUser[i];
      const hasEnrollSameDatetime = await Meetup.findOne({
        where: { id: meetupIdFromUser, datetime: { [Op.eq]: meetup.datetime } }
      });
      if (hasEnrollSameDatetime) {
        return res.status(400).json({
          error: "User is already enrolled on this date."
        });
      }
    }

    await Enroll.create({
      user_id: req.userId,
      meetup_id: meetupId
    });

    const enroll = await Enroll.findOne({
      where: {
        user_id: req.userId,
        meetup_id: meetupId
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name", "email"]
        },
        {
          model: Meetup,
          as: "meetup",
          attributes: ["title"]
        }
      ]
    });

    await Notification.create({
      content: `Nova inscrição de ${enroll.user.name} para o Meetup ${enroll.meetup.title}!`,
      user: req.userId
    });

    await Queue.add(EnrollMail.key, {
      enroll
    });

    return res.json(enroll);
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      datetime: Yup.date().required(),
      banner: Yup.string().required()
    });

    const { id, datetime } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Meetups id is required" });
    }

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }

    if (isBefore(parseISO(datetime), new Date())) {
      return res.status(400).json({ error: "Past dates are not permitted" });
    }

    const userExists = await User.findOne({
      where: { id: req.userId }
    });

    if (!userExists) {
      return res.status(400).json({ error: "User does not exists" });
    }

    const meetup = await Meetup.findByPk(id);

    if (req.userId !== meetup.user_id) {
      return res
        .status(400)
        .json({ error: "User is not administrator of this meetup" });
    }

    const { title, description, location, banner } = await meetup.update(
      req.body
    );

    return res.json({ id, title, description, location, datetime, banner });
  }

  async delete(req, res) {
    const meetup = await Meetup.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["name"]
        }
      ]
    });

    if (meetup.user_id !== req.userId) {
      return res
        .status(401)
        .json({ error: "You dont have permission to cancel this meetup" });
    }

    if (isBefore(meetup.datetime, new Date())) {
      return res
        .status(401)
        .json({ error: "You can only cancel meetups that not happened" });
    }

    await meetup.destroy();

    return res.json({ success: true });
  }
}

export default new EnrollController();
