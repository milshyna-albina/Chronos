const validateId = (param) => {
  return (req, res, next) => {
    const id = req.params[param];
    const regex = /^[a-fA-F0-9]{24}$/;
    
    if (!regex.test(id)) {
      return res.status(400).json({
        message: `Invalid ${param.split('_')[0]} ID.`
      });
    }

    next();
  };
};

module.exports = { validateId }