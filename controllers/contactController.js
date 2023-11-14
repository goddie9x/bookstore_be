const Contact = require("../models/Contact");
const User = require("../models/User");

const sendContact = async (req, res, next) => {
  try {
    const { user, fullName, phoneNumber, email, message } = { ...req.body };
    const userFound = await User.findById(user);
    if (!userFound || !userFound._id) {
      var err = new Error("User not exists!");
      next(err);
      return res.status(404);
    }
    const newContact = new Contact({
      user,
      fullName,
      phoneNumber,
      email,
      message,
    });
    await newContact.save();
    res.status(200).json({ newContact });
  } catch (err) {
    next(err);
  }
};

const getContact = async (req, res, next) => {
  try {
    const listContact = await Contact.find({}).lean();
    res.status(200).json({ listContact });
  } catch (err) {
    next(err);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    const { contactId } = { ...req.body };
    console.log("contactID: ",contactId)
    const docFound = await Contact.findById(contactId);
    if (!docFound || !docFound._id) {
      var err = new Error("Contact not exists!");
      next(err);
      return res.status(404);
    }
    await Contact.findByIdAndDelete(contactId);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  sendContact,
  getContact,
  deleteContact,
};
