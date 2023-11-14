const Comment = require("../models/comment");
const User = require("../models/User");
const Product = require("../models/Product");

const userComment = async (req, res, next) => {
  try {
    const { user, author, comment, product, rating } = req.body;
    // const comment=req.bodys
    //    const newComment= await Comment.create(comment)
    const newComment = new Comment({ user, comment, author, product, rating });
    const reusult = await newComment.save();
    const ratingProduct = await Comment.find({ product: product })
      .lean()
      .select("rating");
    const totalRating = ratingProduct.reduce((accumulator, item) => {
      return accumulator + item.rating;
    }, 0);
    const productRarting = await Product.findById(product)
      .lean()
      .select("rating");
    const newRating = (
      (productRarting.rating + totalRating) /
      (ratingProduct.length + 1)
    ).toFixed(1);

    await Product.updateOne({ _id: product }, { $set: { rating: newRating } });
    return res.status(200).json({ success: true, reusult, status: "ok" });
  } catch (error) {
    next(error);
  }
};

const getComment = async (req, res, next) => {
  try {
    const comments = await Comment.find({ product: req.params.productId })
      .populate("user")
      .lean();
    // console.log(comments)
    const total = comments.length;
    return res
      .status(200)
      .json({ success: true, comments, total, status: "ok" });
  } catch (error) {
    next(error);
  }
};

const deleteComment = async (req, res, next) => {
  const { commentId } = { ...req.params };
  console.log(commentId);
  const docFound = await Comment.findById(commentId);
  if (!docFound || !docFound._id) {
    var err = new Error("Comment not exists!");
    err.status(404);
    return next(err);
  }
  const deleteComment = await Comment.findByIdAndDelete(commentId);
  const listRating = await Comment.find({ product: docFound.product })
    .select("rating")
    .lean();
  const totalRating = listRating.reduce((accumulator, item) => {
    return accumulator + item.rating;
  }, 0);

  const productRating = await Product.findById(docFound.product)
    .lean()
    .select("rating");
  const newRating = (
    (productRating.rating + totalRating) /
    (listRating.length + 1)
  ).toFixed(1);
  await Product.updateOne({ _id: docFound.product }, { $set: { rating: newRating } });

  res.status(200).json({ success: true, deleteComment });
};
module.exports = {
  userComment,
  getComment,
  deleteComment,
};
