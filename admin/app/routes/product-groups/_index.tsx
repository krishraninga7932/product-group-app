import axios from "axios";
import {
  Search,
  ListFilter,
  Ellipsis,
  CopyPlus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";

import {
  eq,
  sql,
  desc,
  inArray
} from "drizzle-orm";

import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useLoaderData, useNavigation, useFetcher, useNavigate } from "react-router";
import GlobalLoader from "../../components/GlobalLoader";
import type { Route } from "../+types/home";




// loader
export async function loader() {

  const { db } = await import("../../db");

  const {
    productGroups,
    groupProducts
  } = await import("../../db/schema/schema");

  const groups = await db
    .select({

      id: productGroups.id,

      name: productGroups.name,

      image: productGroups.image,

      status: productGroups.status,

      createdAt: productGroups.createdAt,

      totalProducts:
        sql<number>`
    CAST(count(${groupProducts.id}) AS INT)
  `.as("totalProducts"),

    })

    .from(productGroups)

    .leftJoin(
      groupProducts,
      eq(productGroups.id, groupProducts.groupId)
    )

    .groupBy(productGroups.id)

    .orderBy(
      desc(productGroups.createdAt)
    );

  return { groups };
}



// action
export async function action({
  request,
}: Route.ActionArgs) {

  const formData = await request.formData();

  const deleteMode =
    String(formData.get("deleteMode"));

  const syncMode = String(formData.get("syncMode"))

  const groupId =
    Number(formData.get("groupId"));

  const { db } =
    await import("../../db");

  const {
    productGroups,
    groupProducts,
  } = await import(
    "../../db/schema/schema"
  );


  // syncMode
  if (syncMode === "single") {

    const response = await axios.post(
      "https://apps.flicksell.com/admin/2025-07/graphql",
      {
        query: `
                query Products {
                    products(
                        sortKey: CREATED_AT
                        reverse: true
                    ) {
                        edges {
                            node {
                                id
                                title
                                primaryMediaUrl
                            }
                        }
                    }
                }
            `
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Flicksell-Access-Token":
            "fsoff_864fb35100869060720ef4182a45d8bb"
        }
      }
    );

    const latestProducts =
      response.data.data.products.edges.map(
        (item: any) => ({
          id: item.node.id,
          name: item.node.title,
          image: `https://cdn.flicksell.com/${item.node.primaryMediaUrl}`,
        })
      );


    const productsInGroup =
      await db
        .select()
        .from(groupProducts)
        .where(
          eq(
            groupProducts.groupId,
            groupId
          )
        );

    console.log("GROUP PRODUCTS");
    console.log(productsInGroup);


    for (const dbProduct of productsInGroup) {
      const latestProduct = latestProducts.find((p: any) => p.id === dbProduct.productId);
      if (!latestProduct) continue;

      await db.update(groupProducts).set({
        productName: latestProduct.name,
        productImage: latestProduct.image
      }).where(
        eq(
          groupProducts.id,
          dbProduct.id
        )
      )

    }


    const firstProduct = productsInGroup[0];

    if (firstProduct) {

      const latestFirstProduct =
        latestProducts.find(
          (p: any) =>
            p.id === firstProduct.productId
        );

      if (latestFirstProduct) {

        await db
          .update(productGroups)
          .set({
            image: latestFirstProduct.image
          })
          .where(
            eq(
              productGroups.id,
              groupId
            )
          );

      }

    }


    return {
      success: true
    };
  }

  // SINGLE DELETE
  if (deleteMode === "single") {

    await db
      .delete(groupProducts)
      .where(
        eq(
          groupProducts.groupId,
          groupId
        )
      );

    await db
      .delete(productGroups)
      .where(
        eq(
          productGroups.id,
          groupId
        )
      );

    return {
      success: true,
    };
  }

  // BULK DELETE
  if (deleteMode === "bulk") {

    const selectedRows = JSON.parse(
      String(
        formData.get("selectedRows")
      )
    ) as number[];

    await db
      .delete(groupProducts)
      .where(
        inArray(
          groupProducts.groupId,
          selectedRows
        )
      );

    await db
      .delete(productGroups)
      .where(
        inArray(
          productGroups.id,
          selectedRows
        )
      );

    return {
      success: true,
    };
  }

  return {
    success: false,
  };
}



export default function ProductGroupsPage() {

  const fetcher = useFetcher()
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isNavigating = navigation.state === "loading";
  // REPLACE with this
  const { groups } = useLoaderData<typeof loader>();


  const [selectAll, setSelectAll] =
    useState(false);

  const [activeAction, setActiveAction] =
    useState<string | null>(null);

  const [selectedRows, setSelectedRows] =
    useState<number[]>([]);

  const [showSearch, setShowSearch] =
    useState(false);

  const [searchTerm, setSearchTerm] =
    useState("");

  // FILTER PRODUCTS
  const filteredGroups = useMemo(() => {

    const search =
      searchTerm
        .toLowerCase()
        .replace(/\s+/g, "");

    return groups.filter((group: any) =>

      group.name
        .toLowerCase()
        .replace(/\s+/g, "")
        .includes(search)

    );

  }, [searchTerm, groups]);

  // SELECT ALL
  const handleSelectAll = () => {

    if (selectAll) {

      setSelectedRows([]);

      setSelectAll(false);

    } else {

      setSelectedRows(
        filteredGroups.map((group: any) => group.id)
      );

      setSelectAll(true);

    }
  };

  // SINGLE SELECT
  const handleRowSelect = (id: number) => {

    if (selectedRows.includes(id)) {

      setSelectedRows(
        selectedRows.filter(
          (item) => item !== id
        )
      );

    } else {

      setSelectedRows([
        ...selectedRows,
        id,
      ]);

    }
  };


  const [openDelMenu, setOpenDelMenu] = useState<number | null>(null);

  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuButtonRef.current?.contains(e.target as Node)) return; // skip — button handles it
      if (!(e.target as HTMLElement).closest(".del-menu-wrapper")) {
        setOpenDelMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // const isDeleting = fetcher.state == "submitting"

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)
  const isDeleting = showDeleteModal && fetcher.state === "submitting";
  useEffect(() => {

    if (fetcher.data?.success) {

      setShowDeleteModal(false);

      setSelectedGroupId(null);

    }

  }, [fetcher.data]);

  const [deleteMode, setDeleteMode] = useState<"single" | "bulk">("single");
  useEffect(() => {

    if (fetcher.data?.success) {

      setShowDeleteModal(false);

      setSelectedGroupId(null);

      setSelectedRows([]);

      setSelectAll(false);

    }

  }, [fetcher.data]);

  useEffect(() => {

    if (
      fetcher.data?.success &&
      syncingGroupId !== null
    ) {

      setShowSyncToast(true);

      setSyncingGroupId(null);

      setTimeout(() => {
        setShowSyncToast(false);
      }, 3000);

    }

  }, [fetcher.data]);

  const [syncingGroupId, setSyncingGroupId] =
    useState<number | null>(null);

  const [showSyncToast, setShowSyncToast] =
    useState(false);


  return (
    <>
      {(isNavigating || isDeleting) && (
        <GlobalLoader
        // text="Loading Page..."
        />
      )}
      {showDeleteModal && (

        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">

            <h2 className="text-[18px] font-semibold text-[#111827]">
              {
                deleteMode === "single"
                  ? "Delete Product Group"
                  : `Delete ${selectedRows.length} Product Groups`
              }
            </h2>

            <p className="mt-2 text-[14px] text-[#6b7280]">
              {deleteMode === "single"

                ? "Are you sure you want to delete this product group? This action cannot be undone."

                : `Are you sure you want to delete ${selectedRows.length} product groups? This action cannot be undone.`

              }
            </p>

            <div className="mt-6 flex justify-end gap-3">

              <button
                onClick={() =>
                  setShowDeleteModal(false)
                }
                className="rounded-lg cursor-pointer border border-[#d9d9d9] duration-100 hover:bg-[#00000005] px-4 py-2 text-[14px] font-medium text-[#374151]"
              >
                Cancel
              </button>

              <fetcher.Form method="post">
                <input
                  type="hidden"
                  name="deleteMode"
                  value={deleteMode}
                />

                <input
                  type="hidden"
                  name="selectedRows"
                  value={JSON.stringify(selectedRows)}
                />

                <input
                  type="hidden"
                  name="groupId"
                  value={selectedGroupId ?? ""}
                />
                <button
                  className="rounded-lg bg-red-600 px-4 py-2 text-[14px] duration-100 cursor-pointer font-medium text-white hover:bg-red-700"
                >
                  Delete
                </button>
              </fetcher.Form>

            </div>

          </div>

        </div>

      )}
      {showSyncToast && (

        <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 rounded-lg bg-black px-4 py-3 text-[13px] font-medium text-white shadow-xl">

          Product group synced successfully

        </div>

      )}
      <div className="min-h-screen bg-[#f6f6f7] p-4 font-sans">

        <div className="mx-auto max-w-[1500px]">

          {/* Header */}
          <div className="mb-[32px] mt-[10px] flex items-start justify-between">

            <div>

              <h1 className="text-[20px] font-semibold text-[#111827]">
                Product Groups
              </h1>

              <p className="mt-1 text-[13px] text-[#6b7280]">
                Organize and manage your product groups efficiently.
              </p>

            </div>

            <div className="flex items-center gap-3">

              <button className="cursor-pointer text-[#6b7280] transition hover:text-black">

                <Settings
                  size={16}
                  strokeWidth={2}
                />

              </button>

              <Link
                to="/product-groups/new"
                className="flex items-center gap-2 rounded-lg bg-[#111827] px-3 py-2 text-[12px] font-medium text-white transition hover:opacity-90 shadow-sm"
              >

                Add New

                <span className="text-[16px] leading-none">
                  +
                </span>

              </Link>

            </div>

          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-[14px] border border-[#d9d9d9] bg-white">

            {/* Top Header */}
            <div className="flex items-center justify-between border-b border-[#ececec] px-3 py-[8px]">

              {/* LEFT */}
              <div className="flex flex-1 items-center">

                {!showSearch ? (

                  <div className="flex items-center gap-1.5">

                    <button className="rounded-lg bg-[#f3f4f6] px-3 py-1.5 text-[12px] font-medium text-[#111827]">
                      All
                    </button>

                  </div>

                ) : (

                  <div className="flex w-full items-center gap-2">

                    {/* Search Input */}
                    <div className="flex h-[34px] w-full items-center gap-2 rounded-lg border border-[#d9d9d9] bg-white px-3">

                      <Search
                        size={14}
                        className="text-[#6b7280]"
                      />

                      <input
                        type="text"
                        autoFocus
                        value={searchTerm}
                        onChange={(e) =>
                          setSearchTerm(e.target.value)
                        }
                        placeholder="Search product groups"
                        className="w-full bg-transparent text-[12px] outline-none placeholder:text-[#9ca3af]"
                      />

                    </div>

                  </div>

                )}

              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-2">

                {!showSearch ? (

                  <button
                    onClick={() =>
                      setShowSearch(true)
                    }
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1.5 text-[#4b5563] shadow-sm transition hover:bg-[#fafafa]"
                  >

                    <Search
                      size={15}
                      strokeWidth={2}
                    />

                    <ListFilter
                      size={15}
                      strokeWidth={2}
                    />

                  </button>

                ) : (

                  <button
                    onClick={() => {

                      setShowSearch(false);

                      setSearchTerm("");

                    }}
                    className="flex h-[34px] ml-3 cursor-pointer items-center rounded-lg border border-[#d9d9d9] bg-white px-3 text-[12px] font-medium text-[#4b5563] shadow-sm transition hover:bg-[#fafafa]"
                  >

                    Cancel

                  </button>

                )}

              </div>

            </div>

            {/* Responsive Wrapper */}
            <div className="overflow-x-auto">

              {/* Table Header */}
              {selectedRows.length > 0 ? (
                <div className="flex items-center justify-between border-b border-[#ececec] bg-[#fafafa] px-3 py-2">

                  <div className="flex items-center gap-3">

                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-black"
                    />

                    <span className="text-[13px] font-medium text-[#111827]">

                      {selectedRows.length} selected

                    </span>

                  </div>

                  <button
                    onClick={() => {
                      setDeleteMode("bulk")
                      setShowDeleteModal(true)
                    }}
                    className="flex text-red-800 text-[12px] cursor-pointer items-center gap-1.5 rounded-lg border border-[#d9d9d9] bg-white px-2.5 py-1 text-[#4b5563] shadow-sm transition hover:bg-[#fafafa]"
                  >

                    Delete

                  </button>

                </div>
              ) : (
                <div className="grid min-w-[1200px] grid-cols-[40px_1fr_0.8fr_1fr_0.9fr_1.5fr_120px] items-center border-b border-[#ececec] bg-[#fafafa] px-3 py-2 text-[12px] font-medium text-[#666]">

                  <div>

                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-3.5 w-3.5 rounded border-gray-300 accent-black"
                    />

                  </div>

                  <div>Product group</div>

                  <div>Products</div>

                  <div>Total products</div>

                  <div>Status</div>

                  <div>Created</div>

                  <div></div>

                </div>
              )}

              {/* Rows */}
              {filteredGroups.length > 0 ? (

                filteredGroups.map((group: any) => (
                  <div
                    key={group.id}
                    onClick={() => navigate(
                      `/product-groups/edit/${group.id}`
                    )}
                    className="grid min-w-[1200px] cursor-pointer grid-cols-[40px_1fr_0.8fr_1fr_0.9fr_1.5fr_120px] items-center border-b border-[#ececec] px-3 py-2 transition-colors hover:bg-[#fafafa]"
                  >

                    {/* Checkbox */}
                    <div>

                      <input
                        onClick={(e) => e.stopPropagation()}
                        type="checkbox"
                        checked={selectedRows.includes(group.id)}
                        onChange={() =>
                          handleRowSelect(group.id)
                        }
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-black"
                      />

                    </div>

                    {/* Product Group */}
                    <div className="text-[13px] font-medium text-[#333]">
                      {group.name}
                    </div>

                    {/* Product Image */}
                    <div>

                      <img
                        src={group.image
                          ? group.image
                          : "https://placehold.co/42x42"
                        }
                        alt="product"
                        className="h-[42px] w-[42px] rounded-lg border border-[#d9d9d9]"
                      />

                    </div>

                    {/* Total Products */}
                    <div className="text-[13px] text-[#2563eb]">
                      {group.totalProducts} products
                    </div>

                    {/* Status */}
                    <div>

                      {group.status === "active" && (

                        <div className="inline-flex items-center gap-1 rounded-full bg-[#dcfce7] px-2 py-[2px] text-[10px] font-medium text-[#166534]">

                          <div className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />

                          Active

                        </div>

                      )}

                      {group.status === "draft" && (

                        <div className="inline-flex items-center gap-1 rounded-full bg-[#fef3c7] px-2 py-[2px] text-[10px] font-medium text-[#92400e]">

                          <div className="h-1.5 w-1.5 rounded-full bg-[#f59e0b]" />

                          Draft

                        </div>

                      )}

                    </div>

                    {/* Created */}
                    <div className="text-[13px] text-[#444]">
                      {
                        group.createdAt
                          ? new Date(
                            group.createdAt
                          ).toLocaleString(
                            "en-IN",
                            {
                              timeZone: "Asia/Kolkata",

                              day: "2-digit",
                              month: "short",
                              year: "numeric",

                              hour: "2-digit",
                              minute: "2-digit",

                              hour12: true,
                            }
                          )
                          : "--"
                      }
                    </div>

                    {/* Actions */}
                    <div className="flex w-fit items-center rounded-lg border border-[#d9d9d9]">

                      <fetcher.Form
                        method="post"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input type="hidden" name="syncMode" value="single" />
                        <input type="hidden" name="groupId" value={group.id} />
                        <button
                          type="submit"
                          onClick={() => setSyncingGroupId(group.id)}
                          className="cursor-pointer border-r border-[#d9d9d9] p-2 text-[#555] transition hover:bg-[#f5f5f5]"
                        >

                          {syncingGroupId === group.id &&
                            fetcher.state === "submitting" ? (

                            <div className="h-[14px] w-[14px] animate-spin rounded-full border-2 border-[#555] border-t-transparent" />

                          ) : (

                            <RefreshCw size={14} />

                          )}

                        </button>


                      </fetcher.Form>

                      <div className="relative del-menu-wrapper">
                        <button
                          ref={menuButtonRef}
                          onClick={(e) => {
                            e.stopPropagation()

                            setOpenDelMenu(
                              openDelMenu === group.id ? null : group.id
                            )
                          }}
                          className="cursor-pointer p-2 text-[#555] transition hover:bg-[#f5f5f5]">

                          <Ellipsis size={14} />

                        </button>

                        {openDelMenu === group.id && (
                          <div className="absolute right-[-100%] top-[-170%] z-50 min-w-[80px] rounded-xl border border-[#d9d9d9] bg-white shadow-lg">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteMode("single")
                                setSelectedGroupId(group.id)
                                setShowDeleteModal(true)
                                setOpenDelMenu(null)
                              }}
                              className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-[14px] font-medium text-red-700 transition rounded-xl hover:bg-red-50"
                            >
                              <Trash2
                                size={16}
                                strokeWidth={2}
                              />

                              Delete
                            </button>
                          </div>
                        )}

                      </div>

                    </div>

                  </div>
                ))

              ) : (

                <div className="flex flex-col items-center justify-center py-14">

                  <img
                    src="https://cdn-icons-png.flaticon.com/512/7486/7486740.png"
                    alt="empty"
                    className="mb-3 h-20 w-20 opacity-80"
                  />

                  {groups.length === 0 ? (

                    <>
                      <h3 className="text-[14px] font-medium text-[#374151]">
                        No product groups yet
                      </h3>

                      <p className="mt-1 text-[12px] text-[#9ca3af]">
                        Create your first product group to get started.
                      </p>

                      <Link
                        to="/product-groups/new"
                        className="mt-4 rounded-lg bg-[#111827] px-4 py-2 text-[12px] font-medium text-white transition hover:opacity-90 shadow-sm"
                      >
                        Create Group
                      </Link>
                    </>

                  ) : (

                    <>
                      <h3 className="text-[14px] font-medium text-[#374151]">
                        No product groups found
                      </h3>

                      <p className="mt-1 text-[12px] text-[#9ca3af]">
                        Try searching with another keyword.
                      </p>
                    </>

                  )}

                </div>

              )}

            </div>

          </div>

        </div>

      </div >
    </>
  );
} 