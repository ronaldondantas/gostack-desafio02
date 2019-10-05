import Mail from "../../lib/Mail";

class EnrollMail {
  get key() {
    return "EnrollMail";
  }

  async handle({ data }) {
    const { enroll } = data;

    await Mail.sendMail({
      to: `${enroll.user.name} <${enroll.user.email}`,
      subject: `${enroll.meetup.title} - Inscrição realizada`,
      template: "enroll",
      context: {
        name: enroll.user.name,
        title: enroll.meetup.title
      }
    });
  }
}

export default new EnrollMail();
