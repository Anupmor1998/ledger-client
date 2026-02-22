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

const profileSchema = yup.object({
  name: yup.string().trim().required("Name is required"),
  email: yup.string().trim().email("Enter a valid email").required("Email is required"),
  currentPassword: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  newPassword: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test("new-password-length", "New password must be at least 8 characters", (value) => {
      if (!value) return true;
      return value.length >= 8;
    }),
  confirmNewPassword: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .test("confirm-password-match", "Passwords must match", function confirmPassword(value) {
      const { newPassword } = this.parent;
      if (!newPassword && !value) return true;
      return newPassword === value;
    }),
}).test(
  "password-pair",
  "Current and new password are required to change password",
  (values) => {
    const hasCurrent = Boolean(values?.currentPassword);
    const hasNew = Boolean(values?.newPassword);
    const hasConfirm = Boolean(values?.confirmNewPassword);
    if (!hasCurrent && !hasNew && !hasConfirm) {
      return true;
    }
    return hasCurrent && hasNew && hasConfirm;
  }
);

export { loginSchema, signupSchema, forgotPasswordSchema, resetPasswordSchema, profileSchema };
