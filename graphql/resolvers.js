const bcrypt = require('bcryptjs')
const validator = require('validator')
const jwt = require('jsonwebtoken')

const User = require('../models/user')
const Post = require('../models/post')
const deleteImage = require('../util/delete-image')


module.exports = {
    createUser: async function ({userInput}, req){
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
          errors.push({ message: 'E-Mail is invalid.' });
        }
        if ( validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 }) ) 
        {
          errors.push({ message: 'Password too short!' });
        }
        if (errors.length > 0) {
          const error = new Error('Invalid input.');
          error.data = errors;
          error.code = 422;
          throw error;
        }
    
        const existingUser = await User.findOne({email: userInput.email})
        if (existingUser) {
            const error = new Error('User already exists')
            throw error        
        }
        const hashedPassword = await bcrypt.hash(userInput.password, 12)
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashedPassword
        })
        const createdUser = await user.save()
        return {...createdUser._doc, _id: createdUser._id.toString()}
    },
    login: async function ({email, password}){
        const user = await User.findOne({email: email})
        if (!user) {
            const error = new Error('No such user')
            error.code = 401
            throw error
        }

        const isEqual = await bcrypt.compare(password, user.password)
        if (!isEqual) {
            const error = new Error('Password is incorrect')
            error.code = 401
            throw error
        }

        const token = jwt.sign(
        {
            userId: user._id.toString(),
            email: user.email,
        },'secrettokenkey', 
        {expiresIn: '1h'}
        )

        return {token: token, userId: user._id.toString()}
    },
    createPost: async function({postInput}, req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }
        const errors = []
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({message: 'Title must have a mnimum of 5 characters'})
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const user = await User.findById(req.userId)
        if (!user) {
            const error = new Error('Invalid User')
            error.code = 401
            throw error
        }
        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user
        })
        const createdPost  = await post.save()
        user.posts.push(createdPost)
        await user.save()
        return{...createdPost._doc, _id: createdPost._id.toString(), createdAt: createdPost.createdAt.toISOString(), updatedAt: createdPost.updatedAt.toISOString()}
  
    },
    getPosts: async function({page}, req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }
        const currentPage = page || 1
        const perPage = 2

        let totalItems
    
        const count = await Post.find().countDocuments()
        totalItems = count

        const posts = await Post.find().sort({createdAt: -1}).populate('creator').skip((currentPage - 1) * perPage).limit(perPage)
        // const posts = await Post.find().populate('creator')
        if (!posts) {
            const error = new Error('Post not found')
            error.code = 404
            throw error
        }
        // return{
        //     posts: posts.map(post => {
        //         return {...post._doc, _id: post._id.toString(), createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString()}
        //     })
        // }
        // console.log{posts: posts}
        const postData = posts.map(post => {
            return {...post._doc, _id: post._id.toString(), createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString()}
        })


        return{
            post: postData,
            totalPosts: totalItems
        }

        // res.status(200).json({
        //     posts: posts,
        //     totalItems: totalItems
        // })
        
    },
    getPost: async function({postId}, req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }
        const post = await Post.findById(postId).populate('creator')
        if(!post){
            const error = new Error('Post not found')
            error.code = 404
            throw error
        }

        const postData = {...post._doc, _id: post._id, createdAt: post.createdAt.toISOString(), updatedAt: post.updatedAt.toISOString()}
        return {post: postData}
    },
    updatePost: async function({id, postInput}, req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }
        const post = await Post.findById(id).populate('creator')
        if (!post) {
            const error = new Error('Post not found')
            error.code = 404
            throw error
        }
        if(post.creator._id.toString() !== req.userId.toString()){
            const error = new Error('Not Authorized')
            error.code = 403
            throw error
        }
        const errors = []
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({message: 'Title must have a mnimum of 5 characters'})
        }
        if (errors.length > 0) {
            const error = new Error('Invalid input.');
            error.data = errors;
            error.code = 422;
            throw error;
        }
        post.title = postInput.title
        post.content = postInput.content
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl
        }
        const updatedPost = await post.save()
        return{
            ...updatedPost._doc,
            _id: updatedPost._id.toString(),
            createdAt: updatedPost.createdAt.toISOString(),
            updatedAt: updatedPost.updatedAt.toISOString()
        }
    },
    deletePost: async function({id}, req){
        if (!req.isAuth) {
            const error = new Error('Not Authenticated')
            error.code = 401
            throw error
        }

        const post = await Post.findById(id)
        if(!post){
            const error = new Error('Post not found')
            error.code = 404
            throw error 
        }          
        await Post.findByIdAndDelete(id)
        deleteImage(post.imageUrl)   

        const user = await User.findById(req.userId)
        user.posts.pull(id)
        await user.save()

        return {message: 'Post Deleted successfully'}

    }
  
}