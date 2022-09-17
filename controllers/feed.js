const {validationResult} = require('express-validator')
const { deleteOne } = require('../models/post')

const io = require('../socket')
const Post = require('../models/post')
const User = require('../models/user')
const deleteImage = require('../util/delete-image')

exports.getPosts = async (req,res,next) => {
    try {
        const currentPage = req.query.page || 1
        const perPage = 2
        let totalItems
 
        const count = await Post.find().countDocuments()
        totalItems = count

        const posts = await Post.find().sort({createdAt: -1}).populate('creator').skip((currentPage - 1) * perPage).limit(perPage)
        console.log(posts)
        res.status(200).json({
            posts: posts,
            totalItems: totalItems
        })
    
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
            return next(error)
        }

    }

}

exports.getPost = async (req,res,next) => {
    try {
        const {postId} = req.params
        const post = await Post.findById(postId) 
        if(!post){
            const error = new Error('Post not found')
            error.statusCode = 404
            return next(error)
        }
        res.status(200).json({
            post:post
        })
    
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
            return next(error)
        }
    }
    
}

exports.postcreatePost = async (req,res,next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        // 422 - validation failed
        const error = new Error('Validation Failed')
        error.statusCode = 422
        return next(error)
    }
    
    try {
        if (!req.file) {
            const error = new Error('Image upload unsucessful')
            error.statusCode = 422
            return next(error)
        }
        let creator
        const title = req.body.title
        const content = req.body.content
        const imageUrl = req.file.path.replace("\\" ,"/");
        const post = new Post({
            title: title,
            content: content,
            imageUrl: imageUrl,
            creator: req.userId
        })
    
        await post.save()
    
        const user = await User.findById(req.userId)

        user.posts.push(post)
        
        creator = user

        await user.save()

        io.emit('posts', {action: 'create', post: post})


        res.status(201).json({
            message: 'Post Created Successfullly',
            post: post,
            creator: {_id: creator._id, name: creator.name}
        })    
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
            return next(error)
        }
    }
}

exports.putUpdatePost = async (req,res,next) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        // 422 - validation failed
        const error = new Error('Validation Failed')
        error.statusCode = 422
        return next(error)
    }

    
    const postId = req.params.postId 
    const {title} = req.body
    const {content} = req.body
    let imageUrl = req.body.image
    
    if (req.file) {
        imageUrl = req.file.path.replace("\\" ,"/")
    }
    
    if (!imageUrl) {
        const error = new Error('No image Found')
        error.statusCode = 422
        return next(error)
    }
    try {
        const post = await Post.findById(postId)
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Unauthorized User')
            error.statusCode = 403
            throw error
        }
        if (!post) {
            const error = new Error('No Post Found')
            error.statusCode = 404
            return next(error)
        }
        if (imageUrl !== post.imageUrl) {
            deleteImage(post.imageUrl)            
        }
        post.title = title
        post.imageUrl = imageUrl
        post.content = content
        await post.save()

        res.status(200).json({
            message: 'Update Successful',
            post: post
        })
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
            return next(error)
        }
    }
}

exports.deletePost = async (req,res,next) => {
    const postId = req.params.postId

    try {
        const post = await Post.findById(postId)
        if (post.creator._id.toString() !== req.userId) {
            const error = new Error('Unauthorized User')
            error.statusCode = 403
            throw error
        }
        if (!post) {
            const error = new Error('No Post Found')
            error.statusCode = 404
            return next(error)
        }
        await Post.findByIdAndDelete(postId)
        deleteImage(post.imageUrl)   

        const user = await User.findById(req.userId)
        user.posts.pull(postId)
        await user.save()
        res.status(200).json({
            message: 'Deleted Successfully'
        })
   
    } catch (error) {
        if(!error.statusCode){
            error.statusCode = 500
            return next(error)
        }
    }
}