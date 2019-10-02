import * as Yup from "yup";
import { parseISO, isBefore } from "date-fns";
import User from "../models/User";
import Meetup from "../models/Meetup";

class MeetupController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ["date"],
      attributes: ["id", "date", "past", "cancelable"],
      limit: 20,
      offset: (page - 1) * 20,
      include: {
        model: User,
        as: "provider",
        attributes: ["id", "name"],
        include: {
          model: File,
          as: "avatar",
          attributes: ["id", "path", "url"]
        }
      }
    });
    return res.json(appointments);
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

    console.log(parseISO(datetime));
    console.log(new Date());
    console.log(isBefore(parseISO(datetime), new Date()));
    console.log(req.userId);

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

    const { id, user_id } = req.body;

    const meetup = await Meetup.findByPk(id);

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: "Validation fails" });
    }

    const userExists = await User.findOne({
      where: { id: user_id }
    });

    if (!userExists) {
      return res.status(400).json({ error: "User does not exists" });
    }

    if (req.userId !== user_id) {
      return res
        .status(400)
        .json({ error: "User is not administrator of this meetup" });
    }

    const {
      title,
      description,
      location,
      datetime,
      banner
    } = await meetup.update(req.body);

    return res.json({ id, title, description, location, datetime, banner });
  }

  async delete(req, res) {
    //
  }
}

export default new MeetupController();
