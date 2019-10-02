import * as Yup from "yup";
import { parseISO, isBefore } from "date-fns";
import User from "../models/User";
import Meetup from "../models/Meetup";

class MeetupController {
  async index(req, res) {
    const meetups = await Meetup.findAll({
      where: { user_id: req.userId },
      order: ["datetime"],
      include: {
        model: User,
        as: "user",
        attributes: ["name"]
      }
    });
    return res.json(meetups);
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
    //
  }
}

export default new MeetupController();
