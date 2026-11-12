const express = require('express');
const TagController = require('../controllers/TagController');
const { authorize } = require('../middlewares/authMiddleware');
const { validateId } = require('../middlewares/validateId');

const router = express.Router();

router.get('/', authorize, TagController.getTags);
router.get('/:tag_id', authorize, validateId('tag_id'), TagController.getTagById);
router.post('/', authorize, TagController.createTag);
router.patch('/:tag_id', authorize, validateId('tag_id'), TagController.updateTag);

module.exports = router;