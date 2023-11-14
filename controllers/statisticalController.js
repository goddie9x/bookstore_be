const Order = require("../models/Order");
const OrderItem = require("../models/OrderItem");
const User = require("../models/User");
const Product = require("../models/Product");
const mongoose = require("mongoose");
const Bluebird = require("bluebird");
const { query } = require("express");

const getStatiscalAdmin = async (req, res, next) => {
  try {
    const month = new Date().getMonth() + 1;
    console.log("Thang ", month)
    const year = new Date().getFullYear();
    console.log(year);
    const orderItem = await OrderItem.aggregate([
      {
        $project: {
          createdAt: { $month: "$createdAt" },
          createdAtYear: { $year: "$createdAt" },
          document: "$$ROOT",
        },
      },
    ]);

    /*-------------------------------month--------------------------------------------------*/
    const orderItemYears = orderItem.filter(
      (item) => item.createdAtYear.toString() === year.toString()
    );
    const orderItemMonth = orderItemYears.filter(
      (item) => item.createdAt.toString() === month.toString()
    );
    const orderItemLastMonth = orderItem.filter(
      (item) => item.createdAt.toString() === (month - 1).toString()
    );
    //   console.log(orderItemMonth);
    const sumWithInitial = orderItem.reduce((currentValue, item) => {
      return item.document.quantity * item.document.price + currentValue;
    }, 0);

    const sumWithInitialMonth = orderItemMonth.reduce((currentValue, item) => {
      return item.document.quantity * item.document.price + currentValue;
    }, 0);
console.log("sum month: ", orderItemMonth)
    const sumWithInitialLastMonth = orderItemLastMonth.reduce(
      (currentValue, item) => {
        return item.document.quantity * item.document.price + currentValue;
      },
      0
    );
    let growth = 0;
    if (
      sumWithInitialMonth &&
      sumWithInitialLastMonth &&
      sumWithInitialLastMonth != 0
    ) {
      growth = Math.round(
        (sumWithInitialMonth / sumWithInitialLastMonth - 1) * 100
      );
    }
    if (!sumWithInitialLastMonth && sumWithInitialMonth) {
      growth = 100;
    }
    /*-------------------------------month--------------------------------------------------*/

    /*-------------------------------Year--------------------------------------------------*/
    const orderItemYear = orderItem.filter(
      (item) => item.createdAtYear.toString() === year.toString()
    );

    const orderItemLastYear = orderItem.filter(
      (item) => item.createdAtYear.toString() === (year - 1).toString()
    );

    const sumWithInitialYear = orderItemYear.reduce((currentValue, item) => {
      return item.document.quantity * item.document.price + currentValue;
    }, 0);

    const sumWithInitialLastYear = orderItemLastYear.reduce(
      (currentValue, item) => {
        return item.document.quantity * item.document.price + currentValue;
      },
      0
    );

    const listGains = await Bluebird.map(
      orderItemYear,
      async (item) => {
        const product = await Product.findById({
          _id: item.document.product,
        }).select("originalPrice");
        return { ...item, product };
      },
      { concurrency: orderItemYear.length }
    );

    const listLastGains = await Bluebird.map(
      orderItemLastYear,
      async (item) => {
        const product = await Product.findById({
          _id: item.document.product,
        }).select("originalPrice");
        return { ...item, product };
      },
      { concurrency: orderItemYear.length }
    );

    const totalGains = listGains.reduce((currentValue, item) => {
      return (
        item.document.quantity * item.document.price -
        item.document.quantity * item.product.originalPrice +
        currentValue
      );
    }, 0);

    const totalLastGains = listLastGains.reduce((currentValue, item) => {
      return (
        item.document.quantity * item.document.price -
        item.document.quantity * item.product.originalPrice +
        currentValue
      );
    }, 0);

    let growthGain = 0;
    if (totalGains && totalLastGains) {
      growthGain = Math.round((totalGains / totalLastGains - 1) * 100);
    }
    if (!totalLastGains && totalGains) {
      growthGain = 100;
    }
    console.log("growthGain ", growthGain);
    console.log("totalLastGains ", totalLastGains);

    let growthYear = 0;
    if (
      sumWithInitialYear &&
      sumWithInitialLastYear &&
      sumWithInitialLastYear != 0
    ) {
      growthYear = Math.round(
        (sumWithInitialYear / sumWithInitialLastYear - 1) * 100
      );
    }
    if (!sumWithInitialLastYear && sumWithInitialYear) {
      growthYear = 100;
    }

    console.log("sumWithInitialLastYear", sumWithInitialLastYear);
    console.log(growthYear);

    const statisTotal = {
      total: sumWithInitial,
      gains: {
        growthGain: growthGain,
        totalGainsYear: totalGains,
        totalGainsLastYear: totalLastGains,
      },
      totalMonth: {
        month: sumWithInitialMonth,
        lastMonth: sumWithInitialLastMonth,
        growth: growth,
      },
      totalYear: {
        year: sumWithInitialYear,
        lastYear: sumWithInitialLastYear,
        growthYear: growthYear,
      },
    };

    res.status(200).json({ success: true, statisTotal });
  } catch (err) {
    next(err);
  }
};

const getTopUser = async (req, res, next) => {
  try {
    const docOrder = await Order.aggregate([
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "order",
          as: "orderItem",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetail",
        },
      },
      {
        $unwind: {
          path: "$userDetail",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const listUsers = await Order.find({}).select("user");
    const filterUser = listUsers
      .filter((itemUser, index, arrayUser) => {
        return (
          arrayUser.findIndex((item) => {
            return item.user.toString() === itemUser.user.toString();
          }) === index
        );
      })
      .map((item) => item.user);

    const topUser = await Bluebird.map(
      filterUser,
      async (item) => {
        const arryOrder = docOrder.filter((vItem) => {
          return vItem.user.toString() === item.toString();
        });
        let sum = 0;
        arryOrder.reduce((currentValue, sItem) => {
          sItem.orderItem.forEach((element) => {
            sum += element.quantity * element.price;
          });
          return sum + currentValue;
        }, 0);
        const user = await User.findById(item).lean();
        return { sum, ...user };
      },
      { concurrency: filterUser.length }
    );

    topUser.sort((a, b) => {
      return b.sum - a.sum;
    });

    console.log(filterUser);
    res.status(200).json({ topUser });
  } catch (err) {
    next(err);
  }
};

const testGetTopUser = async (req, res, next) => {
  try {
    const docFound = await Order.aggregate([
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "order",
          as: "orderItem",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetail",
        },
      },
      {
        $unwind: {
          path: "$userDetail",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);
    const listUser = await Order.find({}).select("user");

    arrayUser = listUser
      .filter((item, index, userArray) => {
        return (
          userArray.findIndex(
            (vItem) => vItem.user.toString() === item.user.toString()
          ) === index
        );
      })
      .map((item) => item.user);

    const listUserSum = await Bluebird.map(
      arrayUser,
      async (itemUser) => {
        let sum = 0;
        const sumUser = docFound
          .filter((itemOrder) => {
            return itemOrder.userDetail._id.toString() === itemUser.toString();
          })
          .reduce((accumulator, sItem) => {
            sum = 0;
            sItem.orderItem.forEach((vItem) => {
              sum += vItem.quantity * vItem.price;
            });
            return accumulator + sum;
          }, 0);
        const user = await User.findById(itemUser).lean();
        return { sumUser, ...user };
      },
      { concurrency: arrayUser.length }
    );

    listUserSum.sort((a, b) => {
      return a.sumUser - b.sumUser; // >0 thi xep a sau b
    });
    res.status(200).json({ success: true, listUserSum });
  } catch (error) {
    next(error);
  }
};

const filterPaginationUser = async (req, res, next) => {
  try {
    const { search, limit, page, sort } = { ...req.query };
    const vPage =
      page && Number.isSafeInteger(Number(page)) && Number(page) > 0
        ? Number(page)
        : 1;

    const vLimit =
      limit && Number.isSafeInteger(Number(limit)) && Number(limit) > 0
        ? Number(limit)
        : 8;

    // const vSearch = search ? search : "";
    const vSort = sort ? sort : "-_id";
    const query ={}
    if (search){
      query.$text = {$search:search}
    }
    const docFound = await User.find(query)
      .skip(vLimit * (vPage - 1))
      .limit(vLimit)
      .sort(vSort)
      .lean();
    totalUser =await User.countDocuments(query);
    totalPage = Math.ceil(totalUser/ vLimit);
    userList = docFound ? docFound : [];
    const paging = {
      totalPage: totalPage,
      nextPage: vPage + 1 <= totalPage ? vPage + 1 : null,
      prevPage: vPage - 1 >= 1 ? vPage - 1 : null,
      total: totalUser,
    };

    res.status(200).json({ success: true, paging,userList  });
  } catch (error) {
    next(error);
  }
};

const getStatiscalMonth = async (req, res, next) => {
  const year = new Date().getFullYear();
  console.log(year)
  const orderItem = await OrderItem.aggregate([
    {
      $project: {
        createdAt: { $month: "$createdAt" },
        createdAtYear: { $year: "$createdAt" },
        document: "$$ROOT",
      },
    },
  ]);

  const orderItemYear = orderItem.filter(
    (item) => item.createdAtYear.toString() === year.toString()
  );

  // console.log(orderItemYear);
  let monthlyRevenue = [];
  const month = [
    {
      id: 1,
      month: "Jan",
    },
    {
      id: 2,
      month: "Feb",
    },
    {
      id: 3,
      month: "Mar",
    },
    {
      id: 4,
      month: "Apr",
    },
    {
      id: 5,
      month: "May",
    },
    {
      id: 6,
      month: "Jun",
    },
    {
      id: 7,
      month: "Jul",
    },
    {
      id: 8,
      month: "Aug",
    },
    {
      id: 9,
      month: "Sep",
    },
    {
      id: 10,
      month: "Oct",
    },
    {
      id: 11,
      month: "Now",
    },
    {
      id: 12,
      month: "Dec",
    },
  ];

  monthlyRevenue = await Bluebird.map(month, async (item) => {
    let sum = 0;

    sum = orderItemYear
      .filter((vItem) => {
        return vItem.createdAt.toString() === item.id.toString();
      })
      .reduce((currentValue, sItem) => {
        return sItem.document.quantity * sItem.document.price + currentValue;
      }, 0);

    return { month: item, sum };
  });

  res.status(200).json({ monthlyRevenue });
};

const getStatiscalUser = async (req, res, next) => {
  try {
    const { userId } = { ...req.params };
    const year = new Date().getFullYear();

    const listOrder = await Order.aggregate([
      {
        $match: {
          $and: [
            { user: mongoose.Types.ObjectId(userId) },
            { $expr: { $eq: [{ $year: "$createdAt" }, year] } },
          ],
        },
      },
      {
        $lookup: {
          from: "orderitems",
          localField: "_id",
          foreignField: "order",
          as: "orderItem",
        },
      },
      {
        $project: {
          createdAt: { $month: "$createdAt" },
          createdYear: { $year: "$createdAt" },
          document: "$$ROOT",
        },
      },
    ]);

    const month = [
      {
        id: 1,
        month: "Jan",
      },
      {
        id: 2,
        month: "Feb",
      },
      {
        id: 3,
        month: "Mar",
      },
      {
        id: 4,
        month: "Apr",
      },
      {
        id: 5,
        month: "May",
      },
      {
        id: 6,
        month: "Jun",
      },
      {
        id: 7,
        month: "Jul",
      },
      {
        id: 8,
        month: "Aug",
      },
      {
        id: 9,
        month: "Sep",
      },
      {
        id: 10,
        month: "Oct",
      },
      {
        id: 11,
        month: "Now",
      },
      {
        id: 12,
        month: "Dec",
      },
    ];

    const turnoverUserByMonth = await Bluebird.map(
      month,
      async (item) => {
        const sumTur = listOrder
          .filter((vItem) => {
            return vItem.createdAt.toString() === item.id.toString();
          })
          .reduce((currentValue, sItem) => {
            let sum = 0;
            sItem.document.orderItem.forEach((fItem) => {
              sum += fItem.quantity * fItem.price;
            });
            return sum + currentValue;
          }, 0);
        return { sumTur, item };
      },
      { concurrency: month.length }
    );

    res.status(200).json({ listOrder, turnoverUserByMonth });
  } catch (err) {
    next(err);
  }
};

const getCategoryByProduct = async (req, res, next) => {
  try {
    const listCategory = await Product.aggregate([
      {
        $lookup: {
          from: "sizes",
          localField: "_id",
          foreignField: "product",
          as: "sizes",
        },
      },
    ]);
    const categorys = listCategory
      .filter((item, index, arrayCate) => {
        return (
          arrayCate.findIndex((vItem) => {
            return (
              vItem.category.toString().toLowerCase().trim() ===
              item.category.toString().toLowerCase().trim()
            );
          }) === index
        );
      })
      .map((item) => item.category);
    // console.log(categorys);
    const numberCategory = await Bluebird.map(
      categorys,
      async (item) => {
        let sum = 0;
        const totalNumberCategory = listCategory
          .filter((vItem) => {
            return (
              vItem.category.toString().toLowerCase().trim() ===
              item.toString().toLowerCase().trim()
            );
          })
          .reduce((currentValue, sItem) => {
            sItem.sizes.forEach((fItem) => {
              sum += fItem.numberInStock;
            });
            return currentValue + sum;
          }, 0);

        return { category: item, sum: totalNumberCategory };
      },
      { concurrency: categorys.length }
    );
    res.status(200).json({ success: true, numberCategory });
  } catch (err) {
    next(err);
  }
};
module.exports = {
  getStatiscalAdmin,
  getTopUser,
  getStatiscalMonth,
  getCategoryByProduct,
  getStatiscalUser,
  testGetTopUser,
  filterPaginationUser,
};
