import * as yup from "yup";

const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const indianPhoneRegex = /^[6-9][0-9]{9}$/;

const partySchema = yup.object({
  userType: yup
    .string()
    .oneOf(["customer", "manufacturer"], "Select a valid user type")
    .required("User type is required"),
  firmName: yup
    .string()
    .trim()
    .when("userType", {
      is: "customer",
      then: (schema) => schema.required("Firm name is required"),
      otherwise: (schema) => schema.nullable().transform((value) => (value === "" ? null : value)),
    }),
  name: yup.string().trim().required("Name is required"),
  gstNo: yup
    .string()
    .trim()
    .transform((value) => {
      const normalized = (value || "").toUpperCase();
      return normalized === "" ? null : normalized;
    })
    .nullable()
    .when("userType", {
      is: "customer",
      then: (schema) =>
        schema.test(
          "gst-format",
          "Enter a valid GSTIN (example: 27ABCDE1234F1Z5)",
          (value) => !value || gstRegex.test(value)
        ),
      otherwise: (schema) => schema.strip(),
    }),
  commissionBase: yup
    .string()
    .transform((value) => (value ? value.toUpperCase() : value))
    .when("userType", {
      is: "customer",
      then: (schema) =>
        schema
          .oneOf(["PERCENT", "LOT"], "Select a valid commission base")
          .required("Commission base is required"),
      otherwise: (schema) => schema.strip(),
    }),
  commissionPercent: yup
    .number()
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .when(["userType", "commissionBase"], {
      is: (userType, commissionBase) => userType === "customer" && commissionBase === "PERCENT",
      then: (schema) =>
        schema
          .typeError("Commission percent must be a number")
          .moreThan(0, "Commission percent must be greater than 0")
          .required("Commission percent is required"),
      otherwise: (schema) => schema.strip(),
    }),
  commissionLotRate: yup
    .number()
    .nullable()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .when(["userType", "commissionBase"], {
      is: (userType, commissionBase) => userType === "customer" && commissionBase === "LOT",
      then: (schema) =>
        schema
          .typeError("Lot rate must be a number")
          .moreThan(0, "Lot rate must be greater than 0")
          .required("Lot rate is required"),
      otherwise: (schema) => schema.strip(),
    }),
  address: yup
    .string()
    .trim()
    .when("userType", {
      is: "customer",
      then: (schema) => schema.required("Address is required"),
      otherwise: (schema) => schema.nullable().transform((value) => (value === "" ? null : value)),
    }),
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
