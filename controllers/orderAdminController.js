const Order=require('../models/Order')
const OrderItem=require('../models/OrderItem')
const User=require('../models/User')
const Product=require('../models/Product')
const Cart=require('../models/Cart')
const Size=require('../models/Size')
const Bluebird=require('bluebird')
const SendMail = require('../utils/sendMail')


const searchOrder = async (querySearch,limit,page)=>{
    console.log("call searchOrder admin")

    const orderSearch =await Order.find(querySearch)
                                .skip((page-1)*limit)
                                .limit(limit)
                                .populate('user')
                                .sort({createdAt:-1})
                                .lean()
    console.log("orderSearch: ",orderSearch)


    return Bluebird.map(orderSearch,
        async(item)=>{
            const orderItems= await OrderItem.find({order : {$in : item._id }})
                                            .populate('product')
                                            .lean()
            const totalPrice =orderItems.reduce((total,item)=>{
                    return  total + item.quantity * item.price
            },0)
        return {...item,totalPrice,items:orderItems}
    },{concurrency : orderSearch.length})
}

const searchOrderPage=async(querySearch,limit=50,page=1)=>{
    console.log("call searchOrderPage admin")
        const vLimit=parseInt(limit)
        const vPage=parseInt(page)
        const {status,cancel}={...querySearch}
        const query={cancel}
        if(status){
            query.status=status
        }
        console.log("querysearch : ",query)

        const [listOrder,totalItem]=await Bluebird.all([searchOrder(query,vLimit,vPage),Order.countDocuments(query)])
        console.log("TotalItem: ",totalItem)
        const pages=Math.ceil(totalItem/vLimit)
        return {listOrder,totalItem,pages}
}
const getOrder = async (req,res,next)=>{
    try{
        console.log("call get order admin")
        const {status,cancel,limit,page}={...req.query}
        // console.log("query: ",req.query)
        const listOrder=await searchOrderPage({status,cancel},limit,page)
        // console.log("listOrder: ",listOrder[0].items)
        return res.status(200).json({success:true,listOrder})
    }   
    catch(error){
        next(error)
    }
}

const acceptStatus = async (req,res,next)=>{
        try{
            const {orderId,status}={...req.body}
            console.log("orderId : ", orderId)
            const orderUpdateStatus =  await Order.findByIdAndUpdate(    
                                            {_id:orderId},
                                            {$set : { status } },
                                            {new: true}
            )

            console.log(orderUpdateStatus);
            const orderItems= await OrderItem.find({order:orderId})

             Bluebird.map(orderItems,async(item)=>{
                        await Product.updateOne(
                            {_id:item.product},
                            {$inc : {sold:item.quantity} }
                        )
            },{concurrency:orderItems.length})
            const user  = await Order.findById(orderId).select('user').lean()
            const userFound = await User.findById(user.user).lean()
            await SendMail(userFound.email,"Order status","Your order has been delivered successfully")
            return res.status(200).json({success:true,orderUpdateStatus,status:"ok"})
        }catch(error){
            next(error)
        }
}

module.exports={
    getOrder,
    acceptStatus
}
