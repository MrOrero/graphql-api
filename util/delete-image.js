const fs = require('fs')
const path = require('path')

const deleteImage = (filepath) => {
    const fullPath = path.join(__dirname, '..', filepath)
    fs.unlink(fullPath, err => console.log(err))
}

module.exports = deleteImage