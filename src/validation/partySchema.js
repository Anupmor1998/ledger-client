import * as yup from "yup";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const indianPhoneRegex = /^[6-9][0-9]{9}$/;

const partySchema = yup.object({
  userType: yup
    .string()
    .oneOf(["customer", "manufacturer"], "Select a valid user type")
    .required("User type is required"),
  name: yup.string().trim().required("Name is required"),
  gstNo: yup
    .string()
    .trim()
    .transform((value) => (value ? value.toUpperCase() : value))
    .matches(gstRegex, "Enter a valid GSTIN (example: 27ABCDE1234F1Z5)")
    .required("GST No is required"),
  address: yup.string().trim().required("Address is required"),
  phone: yup
    .string()
    .trim()
    .matches(indianPhoneRegex, "Enter a valid 10-digit Indian mobile number")
    .required("Phone is required"),
  email: yup
    .string()
    .trim()
    .lowercase()
    .email("Enter a valid email")
    .nullable()
    .transform((value) => {
      if (value === "") return null;
      return value;
    }),
});

export default partySchema;
