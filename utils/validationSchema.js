import Joi from "joi";

const signUpBodyValidation = (body) => {
  const schema = Joi.object({
    name: Joi.string().min(3).label("Name"),
    user_name: Joi.string().email().required().label("User Name"),
    password: Joi.string().min(6).label("Password"),
    verification_code: Joi.string().length(6).label("Verification Code"),
  });
  return schema.validate(body);
};

const logInBodyValidation = (body) => {
  const schema = Joi.object({
    user_name: Joi.string().email().required().label("User Name"),
    password: Joi.string().min(6).required().label("Password"),
  });
  return schema.validate(body);
};

export { signUpBodyValidation, logInBodyValidation };
