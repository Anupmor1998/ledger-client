import * as yup from "yup";

const orderSchema = yup.object({
  customerName: yup.string().trim().required("Customer is required"),
  customerGstNo: yup.string().trim().required("Customer GST No is required"),
  manufacturerName: yup.string().trim().required("Manufacturer is required"),
  manufacturerGstNo: yup.string().trim().required("Manufacturer GST No is required"),
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
});

export default orderSchema;
