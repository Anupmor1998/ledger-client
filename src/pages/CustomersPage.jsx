import PartyTableCard from "../components/PartyTableCard";
import { deleteCustomer, getCustomers, updateCustomer } from "../lib/api";

function CustomersPage() {
  return (
    <PartyTableCard
      title="Customers"
      entityLabel="customer"
      fetchFn={getCustomers}
      updateFn={updateCustomer}
      deleteFn={deleteCustomer}
    />
  );
}

export default CustomersPage;
