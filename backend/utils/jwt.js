import jwt from "jsonwebtoken";

const JWT_SECRET = "e19db21d39525c5ea560c46d06e7053cbd7055daa7e72d3d713eb726e0dde92e2f5ac1fb013e9e1870d05ca7ab7989eea7427855f250e3747bbd4a91bb11ac76";

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: "1d" }
  );
};
