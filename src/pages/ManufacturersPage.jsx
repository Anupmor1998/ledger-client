import PartyTableCard from "../components/PartyTableCard";
import { deleteManufacturer, getManufacturers, updateManufacturer } from "../lib/api";

function ManufacturersPage() {
  return (
    <PartyTableCard
      title="Manufacturers"
      entityLabel="manufacturer"
      fetchFn={getManufacturers}
      updateFn={updateManufacturer}
      deleteFn={deleteManufacturer}
      addEntryPath="/?focus=manufacturer"
    />
  );
}

export default ManufacturersPage;
