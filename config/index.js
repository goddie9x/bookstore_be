const mongoose =require('mongoose');

async function connect(){
    try {
        await mongoose.connect('mongodb://127.0.0.1:27017/Bookstore');
        console.log('success');
    }
    catch(error){
        console.log(error)
        console.log('failed');
    }
};

module.exports={
    connect,
    JWT_SECRET:process.env.JWT_SECRET,
};