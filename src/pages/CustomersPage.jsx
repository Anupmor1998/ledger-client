import PartyTableCard from "../components/PartyTableCard";
import {
  deleteCustomer,
  getCustomerDuplicateGroups,
  getCustomers,
  mergeCustomer,
  previewMergeCustomer,
  updateCustomer,
} from "../lib/api";

function CustomersPage() {
  return (
    <PartyTableCard
      title="Customers"
      entityLabel="customer"
      fetchFn={getCustomers}
      updateFn={updateCustomer}
      deleteFn={deleteCustomer}
      mergeFn={mergeCustomer}
      previewMergeFn={previewMergeCustomer}
      duplicateGroupsFn={getCustomerDuplicateGroups}
      addEntryPath="/?focus=customer"
    />
  );
}

export default CustomersPage;
