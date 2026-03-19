import * as yup from "yup";

const orderSchema = yup.object({
  customerName: yup.string().trim().required("Customer is required"),
  manufacturerName: yup.string().trim().required("Manufacturer is required"),
  quantityUnit: yup
    .string()
    .oneOf(["TAKKA", "LOT", "METER"], "Select a valid quantity unit")
    .required("Quantity unit is required"),
  qualityName: yup.string().trim().required("Quality is required"),
  rate: yup
    .number()
    .typeError("Rate must be a number")
    .moreThan(0, "Rate must be greater than 0")
    .required("Rate is required"),
  quantity: yup
    .number()
    .typeError("Quantity must be a number")
    .moreThan(0, "Quantity must be greater than 0")
    .required("Quantity is required"),
  orderDate: yup
    .string()
    .required("Order date is required")
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format"),
  deliveryDateFrom: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Use YYYY-MM-DD format", excludeEmptyString: true }),
  deliveryDateTo: yup
    .string()
    .nullable()
    .transform((value) => (value === "" ? null : value))
    .matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Use YYYY-MM-DD format", excludeEmptyString: true })
    .test(
      "delivery-range",
      "Delivery to date must be on or after delivery from date",
      function validateDeliveryRange(value) {
        const from = this.parent.deliveryDateFrom;
        if (!from || !value) {
          return true;
        }
        return new Date(from) <= new Date(value);
      }
    ),
  dyeingGuarantees: yup.boolean().default(false),
  remarks: yup
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  customerRemark: yup
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  manufacturerRemark: yup
    .string()
    .trim()
    .nullable()
    .transform((value) => (value === "" ? null : value)),
  paymentDueOn: yup
    .number()
    .nullable()
    .transform((value, originalValue) => (originalValue === "" || originalValue === null ? null : value))
    .integer("Payment due days must be a whole number")
    .min(0, "Payment due days cannot be negative"),
});

export default orderSchema;
