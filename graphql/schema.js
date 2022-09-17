const {buildSchema} = require('graphql')

module.exports = buildSchema(`
    type Post {
        _id: ID!
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID!
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type AuthData{
        token: String!
        userId: String!
    }

    type PostsData{
        post: [Post!]!
        totalPosts: Int!
    }

    type PostData{
        post: Post!
    }

    type DeleteResponse{
        message: String!
    }

    input PostInputData{
        title: String!
        content: String!
        imageUrl: String!
    }

    input UserInputData{
        email: String!
        name: String!
        password: String!
    }

    type RootQuery{
        login(email: String!, password: String!): AuthData!
        getPosts(page: Int!): PostsData!
        getPost(postId: ID!): PostData!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        updatePost(id: ID!, postInput: PostInputData): Post!
        deletePost(id:ID!): DeleteResponse!
    }
    schema{
        query: RootQuery
        mutation: RootMutation
    }
`)