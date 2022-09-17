const path = require('path')

const express = require('express')
const mongoose = require('mongoose')
const multer = require('multer')
const {graphqlHTTP} = require('express-graphql')

const graphqlSchema = require('./graphql/schema')
const graphqlResolver = require('./graphql/resolvers')
const auth = require('./middleware/auth')
const deleteImage = require('./util/delete-image')



const app = express()

const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images')
    },
    filename: (req, file, cb) => {
        date = Date.now()
        cb(null, date + '-' + file.originalname)
    }
})

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg' ||file.mimetype === 'image/jpg' ) {
        cb(null, true)
    }else{
        cb(null, false)
    }
}

app.use(express.json())
app.use('/images', express.static(path.join(__dirname, 'images')))
app.use(multer({storage: fileStorage, fileFilter:fileFilter}).single('image'))


app.use((req,res,next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200)
    }
    next()
})

app.use(auth)

app.put('/post-image', (req,res,next)=> {
    if (!req.isAuth) {
        const error = new Error('Not Authenticated')
        error.code = 401
        throw error
    }

    if(!req.file){
        return res.status(200).json({
            message: 'No file Provided'
        })
    }
    if (req.body.oldPath) {
        deleteImage(req.body.oldPath)        
    }
    const filePath = req.file.path.replace("\\" ,"/");

    return res.status(201).json({message: 'File Stored', filePath: filePath})

})


app.use('/graphql', graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err){
        if (!err.originalError) {
            console.log(err)
            return err
        }
        console.log(err)
        const data = err.originalError.data
        const message = err.message || 'An error Occured'
        const code = err.originalError.code || 500
        return {message: message, data: data, status: code}
    }
}))

app.use((error, req, res, next) => {
    console.log(error)
    const statusCode = error.statusCode
    const message = error.message
    const data = error.data
    return res.status(statusCode).json({
        message: message,
        data: data
    })

})

mongoose.connect('mongodb+srv://Orero:orero2002@cluster0.zf1ulpl.mongodb.net/graphqlblog?retryWrites=true&w=majority')
.then(result => {
    app.listen(8080)  
}).catch(error => {
    console.log(error)
})
