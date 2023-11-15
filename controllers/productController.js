const Product = require('../models/Product')
const Cart = require('../models/Cart')
const Wishlist = require('../models/Wishlist')
const OrderItem = require('../models/OrderItem')
const Order = require('../models/Order')
const Size = require('../models/Size');
const Cloudinary = require('../cloudinary/clouddinary')
var Bluebird = require("bluebird");

const searchSelections = async (req, res, next) => {
    try {
        const priceRanges = [
            { label: 'Dưới 100k', value: { minPrice: 0, maxPrice: 100000 } },
            { label: '100k - 200k', value: { minPrice: 100000, maxPrice: 200000 } },
            { label: '200k - 500k', value: { minPrice: 200000, maxPrice: 500000 } },
            { label: 'Trên 500k', value: { minPrice: 500000, maxPrice: undefined } },
        ];

        const listSubjects = await Product.distinct('subject');
        const listCategories = await Product.distinct('category');

        return res.status(200).json({
            success: true,
            priceRanges,
            listSubjects,
            listCategories,
            status: 'ok',
        });
    } catch (error) {
        console.log(error);
        next(error);
    }
};
const searchProduct = async (req, res, next) => {
    try {
        const { search, subject, page, limit, sort, minPrice, maxPrice, category } = {
            ...req.query,
            ...req.params,
        };

        const products = await searchProductPage(
            search,
            subject,
            page,
            limit,
            sort,
            { minPrice, maxPrice, category }
        );

        return res.status(200).json({ success: true, products, status: 'ok' });
    } catch (error) {
        console.log(error);
        next(error);
    }
};

const searchProductPage = async (
    search = '',
    subject = '',
    page = 1,
    limit = 50,
    sort = '-_id',
    { minPrice, maxPrice, category } = {}
) => {
    const vPage = parseInt(page);
    const vLimit = parseInt(limit);
    const query = {};

    if (search) {
        query.$text = { $search: search };
    }
    if (subject) {
        query.subject = subject;
    }
    if (minPrice || maxPrice) {
        query.price = {};
        if (minPrice) {
            query.price.$gte = parseInt(minPrice);
        }
        if (maxPrice) {
            query.price.$lte = parseInt(maxPrice);
        }
    }
    if (category) {
        query.category = category;
    }

    const [products, total] = await Bluebird.all([
        searchProductSize(query, vPage, vLimit, sort),
        Product.countDocuments(query),
    ]);

    const pages = Math.ceil(total / vLimit);
    return { products, total, pages, page: vPage };
};

const searchProductSize = async (query, page, limit, sort) => {
    const products = await Product.find(query)
        .skip((page - 1) * limit)
        .limit(limit)
        .sort(sort)
        .lean();

    return Bluebird.map(
        products,
        async (product) => {
            const sizes = await Size.find({ product: product._id })
                .select(' name numberInStock')
                .lean();
            return { ...product, sizes };
        },
        { concurrency: products.length }
    );
};

const addProduct = async (req, res, next) => {
    try {

        console.log("call function add product")
        const { size, ...rest } = req.body;
        const product = await Product.create(rest);
        const sizeProudct = size.map(size => ({
            ...size,
            product: product._id
        }))
        await Size.create(sizeProudct);
        console.log("thêm thành công ");
        const result = { ...product, sizes: sizeProudct }
        return res.status(200).json({ success: true, result, status: 'Bạn đã thêm sản phẩm thành công' })


    }
    catch (error) {
        next(error)
    }
}

const getProductId = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.productId).lean();

        if (!product) {
            next(error);
        } else {
            await Product.updateOne(
                { _id: req.params.productId },
                { $inc: { view: 1 } }
            ).exec();

            const relatedProducts = await Product.find({
                category: product.category,
                _id: { $ne: req.params.productId } // Exclude the current product
            }).limit(4).lean();

            const size = await Size.find({ product: product._id }).select('-_id name numberInStock').lean();

            const result = { ...product, size, relatedProducts };
            return res.status(200).json({ success: true, result, status: "Lấy thành công" });
        }
    } catch (error) {
        next(error);
    }
};


const getProductBin = async (req, res, next) => {
    try {
        console.log("call bin product")
        const products = await Product.findWithDeleted({ deleted: true }).lean()
        return res.status(200).json({ success: true, products, total: products.length })
    } catch (error) {
        next(error)
    }
}

const deleteProduct = async (req, res, next) => {
    try {

        const { _id } = { ...req.body }
        const orderItem = await OrderItem.find({ product: _id })
        await OrderItem.delete({ product: _id })
        await Order.delete({ _id: orderItem.order })
        await Cart.deleteMany({ product: { $in: _id } })
        await Wishlist.deleteMany({ product: { $in: _id } })
        await Product.delete({ _id })
        res.status(200).json({ success: true })
    }
    catch (error) {
        next(error)
    }
}

const restoreProduct = async (req, res, next) => {
    try {
        const { _id } = { ...req.body }
        await Product.restore({ _id })
        await OrderItem.restore({ product: _id })
        const orderItemId = await OrderItem.find({ product: _id })
        //check lại
        await Order.restore({ _id: { $in: orderItemId.order } })
        res.status(200).json({ success: true })
    }
    catch (error) {
        next(error)
    }

}

const editProduct = async (req, res, next) => {
    try {
        const { imagesDelete, formData } = { ...req.body }

        const { _id, name, category, description, sizes, images, price, originalPrice } = { ...formData }

        await Product.findByIdAndUpdate(_id, { $set: { images: [] } }, { multi: true })
        await Product.findByIdAndUpdate(_id, { $set: { name, category, description, images, price, originalPrice } })

        await Size.deleteMany({ product: _id })
        sizesUpdate = sizes.map(item => ({
            ...item,
            product: _id
        }))

        await Size.create(sizesUpdate)
        //  console.log("image xoa",imageDelete)
        if (imagesDelete.length > 0) {
            await Cloudinary.delteImage(imagesDelete);
        }
        else {
            console.log("khong co img xoa")
        }
        // console.log("call")
        res.status(200).json({ success: true })
    } catch (error) {
        next(error)
    }
}

module.exports = {
    addProduct,
    searchSelections,
    searchProduct,
    getProductId,
    deleteProduct,
    restoreProduct,
    getProductBin,
    editProduct
}