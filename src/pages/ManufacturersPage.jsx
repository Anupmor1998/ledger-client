import PartyTableCard from "../components/PartyTableCard";
import {
  deleteManufacturer,
  getManufacturerDuplicateGroups,
  getManufacturers,
  mergeManufacturer,
  previewMergeManufacturer,
  updateManufacturer,
} from "../lib/api";

function ManufacturersPage() {
  return (
    <PartyTableCard
      title="Manufacturers"
      entityLabel="manufacturer"
      fetchFn={getManufacturers}
      updateFn={updateManufacturer}
      deleteFn={deleteManufacturer}
      mergeFn={mergeManufacturer}
      previewMergeFn={previewMergeManufacturer}
      duplicateGroupsFn={getManufacturerDuplicateGroups}
      addEntryPath="/?focus=manufacturer"
    />
  );
}

export default ManufacturersPage;
