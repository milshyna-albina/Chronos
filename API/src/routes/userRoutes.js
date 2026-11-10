const express = require('express');
const UserController = require('../controllers/UserController');
const { authorize } = require('../middlewares/authMiddleware');
const { uploadAvatar } = require('../middlewares/uploadMiddleware');
const { validateId } = require('../middlewares/validateId');

const router = express.Router();

router.get('/search', authorize, UserController.searchUsers);
router.get('/:user_id', validateId('user_id'), UserController.getUserById);
router.patch('/avatar', authorize, uploadAvatar, UserController.uploadAvatar);
router.patch('/', authorize, UserController.updateUser);
router.delete('/', authorize, UserController.deleteUser);

module.exports = router;