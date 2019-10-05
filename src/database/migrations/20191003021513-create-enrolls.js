module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable("enrolls", {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: "users", key: "id" },
        allowNull: false
      },
      meetup_id: {
        type: Sequelize.INTEGER,
        references: { model: "meetups", key: "id" },
        allowNull: false
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false
      }
    });
  },

  down: queryInterface => {
    return queryInterface.dropTable("enrolls");
  }
};
