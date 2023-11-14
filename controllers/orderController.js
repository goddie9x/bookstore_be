const Order = require('../models/Order')
const OrderItem = require('../models/OrderItem')
const User = require('../models/User')
const Product = require('../models/Product')
const Cart = require('../models/Cart')
const Size = require('../models/Size')
const Bluebird = require('bluebird')


const searchOrder = async (querySearch, limit, page) => {

    const orderSearch = await Order.find(querySearch)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('user')
        .sort('-_id')
        .lean()

    return Bluebird.map(orderSearch, async (item) => {
        const orderItems = await OrderItem.find({ order: { $in: item._id } }).populate('product').lean()
        const totalPrice = orderItems.reduce((total, item) => {
            return total + item.quantity * item.price
        }, 0)
        // console.log(items[0].product)
        return { ...item, totalPrice, items: orderItems }
    }, { concurrency: orderSearch.length })
}

const searchOrderPage = async (querySearch, limit = 50, page = 1) => {
    const vLimit = parseInt(limit)
    const vPage = parseInt(page)
    const { status, cancel, user } = { ...querySearch }
    const query = { user, cancel }
    if (status) {
        query.status = status
    }
    const [listOrder, totalItem] = await Bluebird.all([searchOrder(query, vLimit, vPage), Order.countDocuments(query)])
    const pages = Math.ceil(totalItem / vLimit);
    return { listOrder, totalItem, pages };
}

const getOrder = async (req, res, next) => {
    try {
        const { status, user, cancel, limit, page } = { ...req.query }
        console.log("query: ", req.query)
        const listOrder = await searchOrderPage({ status, user, cancel }, limit, page)
        res.status(200).json({ success: true, listOrder })
    }
    catch (error) {
        next(error)
    }
}

const createOrder = async (req, res, next) => {
    try {
        const { infoOrder, cartItem } = { ...req.body }
        infoOrder.price = cartItem.reduce((accumulator,currentValue)=>accumulator+=currentValue.price,0)
        const newOrder = await Order.create(infoOrder);
        console.log("cartItem: ", cartItem)
        const newOrderItem = cartItem.map(item => ({
            order: newOrder._id,
            ...item,
        }))
        const createOrderItem = await OrderItem.create(newOrderItem)
        Bluebird.map(cartItem, async (item) => {
            await Size.updateOne(
                { product: item.product },
                { $inc: { numberInStock: -item.quantity } }
            )
        }, { concurrency: cartItem.length })
        const cartId = cartItem.map(item => ({
            _id: item.cartId
        }))
        await Cart.deleteMany({ _id: { $in: cartId } })
        res.status(200).json({ success: true, newOrder, createOrderItem, status: "ok" })
    } catch (error) {
        console.log(error)
        next(error)
    }

}

const cancelOrder = async (req, res, next) => {
    try {
        const { cancel, orderId } = { ...req.body }
        await Order.updateOne({ _id: orderId }, { $set: { cancel } })
        const orderItems = await OrderItem.find({ order: orderId }).lean()
        Bluebird.map(orderItems, async (item) => {
            await Size.updateOne(
                { product: item.product },
                { $inc: { numberInStock: item.quantity } }
            )
        }, { concurrency: orderItems.length })

        res.status(200).json({ success: true, status: "ok" })
    }
    catch (error) {
        next(error)
    }
}

const payment = async (req, res, next) => {
    try {
        const { 
            vnp_Amount,
            vnp_PayDate,
            vnp_OrderInfo,
            vnp_ResponseCode,
            vnp_TransactionStatus,
            vnp_TxnRef } = { ...req.params }
        const order = await Order.findById(vnp_TxnRef)
        if (vnp_ResponseCode != '00'||vnp_TransactionStatus!= '00') {
            const message = 'The payment failed from VNpay'
            order.message = message
            await order.save()
            return res.status(412).json({ success: false,message , status: 'false' })
        }
        if(order.price!=vnp_Amount){
            const message = 'The amount payment does not match, please contact to admin to solve the problem'
            await order.save()
            return res.status(412).json({ success: false,message , status: 'false' })
        }
        order.status = true
        order.message = 'success'
        await order.save()
        res.status(200).json({ success: true, status: "ok" })
    } catch (error) {
        return res.status(500).json({ success: false, message:'There are some error occur in server, please contact to admin to solve the problem', status: 'false' })
    }
}

module.exports = {
    createOrder,
    getOrder,
    cancelOrder,
    payment,
}