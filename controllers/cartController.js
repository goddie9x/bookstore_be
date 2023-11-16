const Cart = require('../models/Cart');
const Product = require('../models/Product');

const checkTocart = async ({ user, product, quantity }) => {
    const productInfo = await Product.findOne({ product })
    
    if (quantity > productInfo.numberInStock) {
        var err = new Error('Không còn đủ sản phẩm trong kho')
        err.status(404)
        return next(err)
    }
    const exitsCartItem = await Cart.findOne({ user, product })
    if (!exitsCartItem) {
        return Cart.create({ user, product, quantity })
    }
    else{
        const newQuantity = quantity + exitsCartItem.quantity
        
        if (newQuantity > productInfo.numberInStock) {
            var err = new Error('Không còn đủ sản phẩm trong kho')
            err.status(404)
            return next(err)
        }
        exitsCartItem.quantity = newQuantity;
        return exitsCartItem.save();
    }
}
const addTocart = async (req, res, next) => {
    try {
        const { user, product, quantity } = { ...req.body }
        const result = await checkTocart({ user, product, quantity })

        return res.status(200).json({ success: true, result, status: "ok" })
    }
    catch (error) {
        console.log(error)
        next(error)
    }
}

const getCartItem = async (req, res, next) => {
    try {
        const carts = await Cart.find({ user: req.params.userId }).populate('user').populate('product').lean()
        return res.status(200).json({ success: true, carts, status: "ok" })
    } catch (error) {
        next(error)
    }
}

const checkUpToCart = async ({ user, product, _id, quantity }) => {
    const CartItem = await Cart.find({ user })
    const exitCartItem = CartItem.find(item => {
        return item._id.toString() != _id.toString() && item.product.toString() === product.toString()
    })
    if (exitCartItem) {
        exitCartItem.quantity += quantity
        await Cart.deleteOne({ _id })
        return exitCartItem.save()
    }
    const productInfo = await Product.findOne({ product })
    if (quantity > productInfo.numberInStock) {
        var err = new Error('Không còn đủ sản phẩm trong kho')
        err.status(404)
        return next(err)
    }
    const result = await Cart.findByIdAndUpdate(_id, quantity , { new: true }).lean()
    return result
}
const updateCartItem = async (req, res, next) => {
    try {
        const { user, product, _id, quantity } = { ...req.body }
        // console.log(req.body)
        // const exitCartItem=await Cart.findOne({user,product,size})
        // if(exitCartItem){
        //     Cart.deleteOne({user,product,size})
        //     exitCartItem.quantity+=quantity
        //    return exitCartItem.save()
        // }
        // const fullSize = await Size.findOne({product,name:size})
        // if (fullSize.numberInStock < quantity){
        //     var err=new Error('không đủ số lượng trong kho');
        //     err.status(404)
        //     return next(err)
        // }
        // const result = await Cart.findByIdAndUpdate(_id,{size,quantity},{new:true}).lean()
        // console.log(result)
        const result = await checkUpToCart({ user, product, _id, quantity })
        return res.status(200).json({ success: true, result, status: "ok" })
    }
    catch (error) {
        next(error)
    }
}

const deleteCartItem = async (req, res, next) => {
    try {
        const { cartId } = req.body
        await Cart.deleteMany({ _id: { $in: cartId } })
        return res.status(200).json({ success: true, status: "ok" })
    } catch (error) {
        next(error)
    }
}
module.exports = {
    addTocart,
    getCartItem,
    deleteCartItem,
    updateCartItem
}