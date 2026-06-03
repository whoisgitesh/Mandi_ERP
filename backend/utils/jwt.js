import jwt from "jsonwebtoken";

const JWT_SECRET = "your_secret_key";

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
};
