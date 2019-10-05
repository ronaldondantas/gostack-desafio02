import * as Yup from "yup";
import { format, parseISO, isBefore } from "date-fns";
import User from "../models/User";
import Meetup from "../models/Meetup";
import pt from "date-fns/locale/pt";
import { Op } from "sequelize";

class MeetupController {
  async index(req, res) {
    const { page = 1, date } = req.query;

    const formattedDate = format(parseISO(date), "yyyy-MM-dd");
    const meetups = await Meetup.findAll({
      where: {
        user_id: req.userId
      },
      order: ["datetime"],
      limit: 10,
      offset: (page - 1) * 10,
      include: {
        model: User,
        as: "user",
        attributes: ["name", "email"]
      }
    });

    const meetupsFiltered = meetups.filter(
      meetup => format(meetup.datetime, "yyyy-MM-dd") === formattedDate
    );

    return res.json(meetupsFiltered);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      title: Yup.string().required(),
      description: Yup.string().required(),
      location: Yup.string().required(),
      datetime: Yup.date().required(),
      banner: Yup.string().required()
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }

    const { title, description, location, banner, datetime } = req.body;

    if (isBefore(parseISO(datetime), new Date())) {
      return res.status(400).json({ error: "Past dates are not permitted" });
    }

    const meetup = await Meetup.create({
      user_id: req.userId,
      title,
      description,
      location,
      datetime,
      banner
    });
    return res.json(meetup);
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

export default new MeetupController();
