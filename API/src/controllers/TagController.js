const Tag = require('../models/Tag');
const { isColorValid, isTagValid } = require('../utils/validator');

class TagController {
  async getTags(req, res) {
    try {
      const tags = await Tag.find({ userId: req.user.id });
      res.status(200).json({
        tags: tags
      });
    } catch (error) {
      console.error('[TagController.getAll]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async getTagById(req, res) {
    try {
      const { tag_id } = req.params;

      const tag = await Tag.findOne({ _id: tag_id, userId: req.user.id });
      if (!tag) {
        return res.status(404).json({
          message: 'Tag not found.'
        });
      }
      res.status(200).json({
        tag: tag
      });
    } catch (error) {
      console.error('[TagController.getTagById]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async createTag(req, res) {
    try {
      const { name, color } = req.body;

      if (!name) {
        return res.status(400).json({
          message: 'Name is required.'
        });
      }
      if (!color) {
        return res.status(400).json({
          message: 'Color is required.'
        });
      }
      if (!isTagValid(name)) {
        return res.status(400).json({
          message: 'Name must be 1-50 characters long.'
        });
      }
      if (!isColorValid(color)) {
        return res.status(400).json({
          message: 'Invalid color format.'
        });
      }

      const trimmedName = name.trim().toLowerCase();
      const existing = await Tag.findOne({
        userId: req.user.id, name: trimmedName
      });
      if (existing) {
        return res.status(400).json({
          message: 'Tag with this name already exists.'
        });
      }

      const newTag = await Tag.create({
        userId: req.user.id,
        name: trimmedName,
        color: color
      });

      res.status(201).json({
        message: 'Tag created successfully.',
        tags: newTag
      });
    } catch (error) {
      console.error('[TagController.createTag]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }

  async updateTag(req, res) {
    try {
      const { tag_id } = req.params;
      const { name, color } = req.body;

      const tag = await Tag.findOne({ _id: tag_id, userId: req.user.id });
      if (!tag) {
        return res.status(404).json({
          message: 'Tag not found or you do not have permission to edit it.'
        });
      }

      if (name !== undefined) {
        if (!isTagValid(name)) {
          return res.status(400).json({
            message: 'Name must be 1-50 characters long.'
          });
        }
        const trimmedName = name.trim().toLowerCase();
        const existing = await Tag.findOne({
          userId: req.user.id, name: trimmedName, _id: { $ne: tag_id }
        });
        if (existing) {
          return res.status(400).json({
            message: 'Tag with this name already exists.'
          });
        }
        tag.name = trimmedName;
      }
      if (color !== undefined) {
        if (!isColorValid(color)) {
          return res.status(400).json({
            message: 'Invalid color format.'
          });
        }
        tag.color = color;
      }

      await tag.save();

      res.status(200).json({
        message: 'Tag updated successfully.',
        tag: tag
      });
    } catch (error) {
      console.error('[TagController.updateTag]:', error.message);
      res.status(500).json({
        message: 'Internal server error.'
      });
    }
  }
}

module.exports = new TagController();