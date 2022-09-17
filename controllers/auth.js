const User = require('../models/user')
const {validationResult} = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = async (req,res,next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        const error = new Error('Validation Failed')
        error.statusCode = 422
        error.data = errors.array()
        throw error
    }
    try {
        const {email} = req.body
        const {name} = req.body
        const {password} = req.body
    
        const hashedPassword = await bcrypt.hash(password, 12)
        const user = new User({
            email: email,
            password: hashedPassword,
            name: name
        })
        const savedUser = await user.save()
        res.status(201).json({
            message: 'User Sucessfully Signed Up',
            userId: savedUser._id
        })
    
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
        }
        return next(error)
    }

}

exports.postLogin = async (req,res,next) => {
    const {email} = req.body
    const {password} = req.body

    try {
        const user = await User.findOne({email: email})
        if (!user) {
            const error = new Error('No such User exists')
            error.statusCode = 401
            throw error
        }
        const isEqual = await bcrypt.compare(password, user.password)
        if(!isEqual){
            const error = new Error('Incorrect Password')
            error.statusCode = 422
            throw error
        }
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString()
        }, 'secrettokenkey',
        {expiresIn: '1h'}
        )
        res.status(200).json({token: token, userId: user._id.toString()})
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
        }
        return next(error)
    }
}