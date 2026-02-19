import * as yup from "yup";

const loginSchema = yup.object({
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  password: yup.string().required("Password is required"),
});

const signupSchema = yup.object({
  name: yup.string().trim().nullable().transform((value) => (value === "" ? null : value)),
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("Password is required"),
});

const forgotPasswordSchema = yup.object({
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
});

const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .min(8, "Password must be at least 8 characters")
    .required("New password is required"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "Passwords must match")
    .required("Confirm password is required"),
});

export { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema };
