import GlobalLoader from "../../components/GlobalLoader";
import { useRef, useState } from "react";
import axios from "axios"
import {
    DndContext,
    closestCenter,
} from "@dnd-kit/core";

import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";



import {
    ArrowLeft,
    Search,
    Upload,
    Tag,
    ImagePlus,
    X,
    AlertCircle,
    GripVertical
} from "lucide-react";

import { Form, Link, useLoaderData, useNavigation, redirect } from "react-router";
import { productGroups } from "../../db/schema/schema";
import { eq } from "drizzle-orm";


export async function action({ request, }: any) {
    try {

        const { db } = await import("../../db");
        const { productGroups, groupProducts } = await import("../../db/schema/schema");

        const formData = await request.formData()

        const groupName = formData.get("groupName")
        const status = String(formData.get("status"))

        const selectedProducts =
            JSON.parse(
                String(
                    formData.get(
                        "selectedProducts"
                    )
                )
            );


        // IMAGE FILE
        // const groupImage = formData.get("groupImage") as File;

        // let imageData = "";

        // if (groupImage && groupImage.size > 0) {
        //     const arrayBuffer = await groupImage.arrayBuffer();
        //     const base64 = Buffer.from(arrayBuffer).toString("base64");
        //     imageData = `data:${groupImage.type};base64,${base64}`;
        // }



        const insertedGroup = await db.insert(productGroups).values({ name: String(groupName), image: selectedProducts[0]?.image || "", status }).returning();

        const groupId = insertedGroup[0].id

        if (selectedProducts.length > 0) {
            await db.insert(groupProducts).values(
                selectedProducts.map((product: any, index: number) => ({
                    groupId,
                    productId: product.id,
                    productName: product.name,   // required, notNull
                    productImage: product.image, // optional but good to have
                    optionValue: product.optionValue || "",
                    sortOrder: index,            // not "position"
                }))
            );
        }

        return redirect("/");




    } catch (error) {
        console.log(error);

        return null;
    }
}



export async function loader() {
    try {

        const response = await axios.post("https://apps.flicksell.com/admin/2025-07/graphql",
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
                                    description
                                    primaryMediaUrl

                                }

                            }

                        }

                    }

                    `
            },

            {

                headers: {

                    "Content-Type":
                        "application/json",

                    "X-Flicksell-Access-Token":
                        "fsoff_864fb35100869060720ef4182a45d8bb"

                }

            }

        );


        const products = response.data.data.products.edges.map((item: any) => ({
            id: item.node.id,
            name: item.node.title,
            image: `https://cdn.flicksell.com/${item.node.primaryMediaUrl}`,
            description: item.node.description
        }));


        // same product filtering
        const { db } = await import("../../db");
        const { groupProducts } = await import("../../db/schema/schema");

        const assignedProducts = await db.select({ productId: groupProducts.productId, groupName: productGroups.name }).from(groupProducts).leftJoin(productGroups, eq(groupProducts.groupId, productGroups.id))

        const assignedProductIds = assignedProducts.map((item) => item.productId)

        const assignedProductMap = Object.fromEntries(
            assignedProducts.map((item) => [
                item.productId,
                item.groupName
            ])
        )

        return {
            products,
            assignedProductIds,
            assignedProductMap
        }



    } catch (err) {
        console.log(err);

        return {
            products: [],
        };
    }
}



function SortableProduct({
    product,
    selectedProducts,
    setSelectedProducts,
    errors,
    setErrors,
}: any) {

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({
        id: product.id,
    });

    const style = {
        transform: transform
            ? `translate3d(0px, ${transform.y}px, 0)`
            : undefined,
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="group flex items-center justify-between rounded-lg border border-[#ececec] p-2.5 transition duration-200 hover:border-[#d4d4d4] hover:bg-[#fafafa]"
        >

            {/* Left */}
            <div className="flex flex-1 items-center gap-3 overflow-hidden">

                {/* Drag Handle */}
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab text-[#9ca3af] active:cursor-grabbing"
                >

                    <GripVertical size={16} />

                </button>

                <img
                    src={product.image}
                    alt=""
                    className="h-[42px] w-[42px] rounded-lg border border-[#d9d9d9]"
                />

                <h3 className="
                    w-[250px]
                    shrink-0
                    overflow-hidden
                    text-ellipsis
                    whitespace-nowrap
                    text-[12px]
                    font-medium
                    text-[#111827]
                ">
                    {product.name}
                </h3>


                <input
                    type="text"
                    placeholder="Option Value"
                    value={product.optionValue || ""}
                    onChange={(e) => {

                        setSelectedProducts(
                            selectedProducts.map(
                                (item: any) =>
                                    item.id === product.id
                                        ? {
                                            ...item,
                                            optionValue: e.target.value,
                                        }
                                        : item
                            )
                        );

                    }}
                    className={`h-[36px] w-[280px] shrink-0 rounded-lg border px-3 text-[12px] outline-none
                 ${errors.optionValue &&
                            !product.optionValue?.trim()
                            ? "border-red-700 bg-red-50"
                            : "border-[#d9d9d9] focus:border-black"
                        }`
                    }
                />


            </div>

            {/* Remove */}
            <button
                type="button"
                onClick={() =>
                    setSelectedProducts(
                        selectedProducts.filter(
                            (item: any) => item.id !== product.id
                        )
                    )
                }
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[#e5e7eb] text-[#6b7280] opacity-0 transition duration-200 hover:bg-[#f3f4f6] hover:text-black group-hover:opacity-100"
            >

                <X size={14} />

            </button>

        </div>
    );
}

export default function NewProductGroupPage() {

    const [showBackLoader, setShowBackLoader] = useState(false);


    // product fetching from graphql
    const { products, assignedProductIds, assignedProductMap } = useLoaderData<typeof loader>();

    const navigation = useNavigation()
    // const isSubmitting = navigation.state === "submitting"
    const isSubmitting =
        navigation.state === "submitting" ||
        navigation.state === "loading";



    const [visibleCount, setVisibleCount] = useState(5)
    const [loadingMore, setLoadingMore] = useState(false)

    const [openModal, setOpenModal] = useState(false);

    const [tempSelected, setTempSelected] = useState<any[]>([]);

    const [selectedProducts, setSelectedProducts] =
        useState<any[]>([]);

    // const [groupImage, setGroupImage] =
    //     useState<string | null>(null);

    // const fileInputRef =
    //     useRef<HTMLInputElement>(null);





    // dragger
    const handleDragEnd = (event: any) => {

        const { active, over } = event;

        if (!over || active.id === over.id) return;

        setSelectedProducts((items) => {

            const oldIndex = items.findIndex(
                (item) => item.id === active.id
            );

            const newIndex = items.findIndex(
                (item) => item.id === over.id
            );

            return arrayMove(items, oldIndex, newIndex);

        });
    };

    const toggleProduct = (product: any) => {

        const exists = tempSelected.some(
            (item) => item.id === product.id
        );

        if (exists) {

            setTempSelected(
                tempSelected.filter(
                    (item) => item.id !== product.id
                )
            );

        } else {

            setTempSelected([
                ...tempSelected,
                {
                    ...product,
                    optionValue: ""
                }
            ]);

        }
    };

    const handleAddProducts = () => {

        setSelectedProducts(tempSelected);
        setErrors(prev => ({
            ...prev,
            products: "",
        }));
        setOpenModal(false);

    };

    // const handleImageUpload = (
    //     e: React.ChangeEvent<HTMLInputElement>
    // ) => {

    //     const file = e.target.files?.[0];

    //     if (file) {

    //         const imageUrl = URL.createObjectURL(file);

    //         setGroupImage(imageUrl);

    //         setErrors(prev => ({
    //             ...prev,
    //             image: "",
    //         }));

    //     }
    // };


    // for products fetching map

    type Product = {

        id: string;

        name: string;

        image: string;

        description: string;

    };


    // errors
    const [errors, setErrors] = useState({
        groupName: "",
        status: "",
        products: "",
        optionValue: "",
        image: "",
    });


    const validateForm = () => {

        const newErrors = {
            groupName: "",
            status: "",
            products: "",
            optionValue: "",
            image: "",
        };

        const groupName =
            (
                document.querySelector(
                    'input[name="groupName"]'
                ) as HTMLInputElement
            )?.value;

        const status =
            (
                document.querySelector(
                    'select[name="status"]'
                ) as HTMLSelectElement
            )?.value;

        if (!groupName?.trim()) {
            newErrors.groupName =
                "Group name is required";
        }

        if (!status) {
            newErrors.status =
                "Status is required";
        }

        if (selectedProducts.length === 0) {
            newErrors.products =
                "Please select at least one product";
        }

        // if (!groupImage) {
        //     newErrors.image =
        //         "Group image is required";
        // }

        const hasEmptyOptionValue = selectedProducts.some((product: any) => !product.optionValue?.trim())
        if (hasEmptyOptionValue) {
            newErrors.optionValue = "Add atleast 1 value";
        }

        setErrors(newErrors);

        return !Object.values(newErrors)
            .some(Boolean);
    };


    const [modalSearch, setModalSearch] = useState("");
    const filteredProducts = products.filter(
        (product: Product) =>
            product.name
                .toLowerCase()
                .replace(/\s+/g, "")
                .includes(
                    modalSearch
                        .toLowerCase()
                        .replace(/\s+/g, "")
                )
    );
    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const handleModalScroll = (
        e: React.UIEvent<HTMLDivElement>
    ) => {

        const target = e.currentTarget;

        const reachedBottom =
            target.scrollTop +
            target.clientHeight >=
            target.scrollHeight - 20;

        if (
            reachedBottom &&
            visibleCount < filteredProducts.length
        ) {

            setLoadingMore(true);

            setTimeout(() => {

                setVisibleCount(
                    prev => prev + 5
                );

                setLoadingMore(false);

            }, 500);

        }

    };




    const [selectedProductSearch, setSelectedProductSearch] = useState("");
    const filteredSelectedProducts =
        selectedProducts.filter((product) =>

            product.name
                .toLowerCase()
                .replace(/\s+/g, "")
                .includes(
                    selectedProductSearch
                        .toLowerCase()
                        .replace(/\s+/g, "")
                )

        );

    return (
        <Form
            method="post"
            encType="multipart/form-data"
            onSubmit={(e) => {

                if (!validateForm()) {

                    e.preventDefault();

                }

            }}>

            {(isSubmitting || showBackLoader) && (



                <GlobalLoader />

            )}

            <input type="hidden" name="selectedProducts" value={JSON.stringify(selectedProducts.map(({ id, name, image, optionValue }) => ({ id, name, image, optionValue })
            ))}
            />


            <div className="min-h-screen bg-[#f6f6f7] p-3 font-sans">

                <div className="mx-auto max-w-[1400px]">

                    {/* Header */}
                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div className="flex items-center gap-2.5">

                            <Link
                                to="/"
                                onClick={() =>
                                    setShowBackLoader(true)
                                }
                                className="flex h-8 w-8 shadow-sm cursor-pointer items-center justify-center rounded-lg bg-[#111827] text-white transition duration-200 hover:opacity-90"
                            >
                                <ArrowLeft size={15} />
                            </Link>

                            <div>

                                <h1 className="text-[18px] font-semibold text-[#111827]">
                                    Add Product Group
                                </h1>

                                <p className="mt-[2px] text-[12px] text-[#6b7280]">
                                    Create and organize product groups.
                                </p>

                            </div>

                        </div>

                        <button type="submit" className="w-fit cursor-pointer rounded-lg bg-[#111827] px-4 py-2 text-[12px] font-medium text-white transition duration-200 hover:opacity-90 shadow-sm">

                            Save Group
                        </button>

                    </div>

                    {/* Main Layout */}
                    <div className="space-y-4">

                        {/* Left Side */}
                        <div className="space-y-4">

                            {/* Group Name */}
                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                                <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-4">

                                    <label className="mb-2 block text-[13px] font-medium text-[#111827]">
                                        Group Name
                                    </label>

                                    <input
                                        type="text"
                                        onChange={(e) => {

                                            if (e.target.value.trim()) {

                                                setErrors(prev => ({
                                                    ...prev,
                                                    groupName: "",
                                                }));

                                            }

                                        }}
                                        placeholder="Group Name"
                                        name="groupName"
                                        className={`h-[40px] w-full rounded-lg border bg-[#fafafa] px-3 text-[13px] outline-none transition duration-200

                                    ${errors.groupName
                                                ? "border-red-700 bg-red-50"
                                                : "border-[#d9d9d9] focus:border-black focus:bg-white"
                                            }
                                    `}
                                    />

                                    {errors.groupName && (
                                        <div className="mt-2 flex items-center gap-2 text-[12px] text-red-700">
                                            <AlertCircle size={14} />
                                            <span>{errors.groupName}</span>
                                        </div>
                                    )}

                                </div>
                                <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-4">

                                    <label className="mb-2 block text-[13px] font-medium text-[#111827]">

                                        Group Status

                                    </label>

                                    <select
                                        onChange={() => {

                                            setErrors(prev => ({
                                                ...prev,
                                                status: "",
                                            }));

                                        }}
                                        name="status"
                                        className={`h-[40px] w-full rounded-lg border border-[#d9d9d9] bg-[#fafafa] px-3 text-[13px] outline-none transition focus:border-black focus:bg-white text-[#374151] ${errors.status
                                            ? "border-red-700 bg-red-50"
                                            : "border-[#d9d9d9]"
                                            }`}
                                    >

                                        <option value="active">
                                            Active
                                        </option>

                                        <option value="draft">
                                            Draft
                                        </option>


                                    </select>
                                    {errors.status && (
                                        <div className="mt-2 flex items-center gap-2 text-[12px] text-red-700">
                                            <AlertCircle size={14} />
                                            <span>{errors.status}</span>
                                        </div>
                                    )}

                                </div>
                            </div>

                            {/* Product Section */}
                            <div className="overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-white">

                                {/* Search Header */}
                                {errors.products && (
                                    <div className="border-b border-[#ececec] px-3 py-2">
                                        <div className="flex items-center gap-2 text-[12px] text-red-700">
                                            <AlertCircle size={14} />
                                            <span>{errors.products}</span>
                                        </div>
                                    </div>
                                )}
                                <div className="border-b border-[#ececec] p-3">

                                    <div className="flex flex-col gap-2 sm:flex-row">

                                        {/* Search */}
                                        <div
                                            className="flex h-[40px] flex-1 cursor-text items-center gap-2 rounded-lg border border-[#d9d9d9] bg-[#fafafa] px-3 transition duration-200 hover:border-[#bdbdbd]"
                                        >

                                            <Search
                                                size={16}
                                                className="text-[#6b7280]"
                                            />

                                            <input
                                                type="text"
                                                value={selectedProductSearch}
                                                onChange={(e) => setSelectedProductSearch(e.target.value)}
                                                placeholder="Search products"
                                                className="w-full cursor-text bg-transparent text-[13px] text-[#111827] outline-none placeholder:text-[#9ca3af]"
                                            />

                                        </div>

                                        {/* Browse */}
                                        <button
                                            type="button"
                                            onClick={() => setOpenModal(true)}
                                            className="h-[40px] cursor-pointer rounded-lg shadow-sm bg-white px-7 text-[12px] font-medium border border-[#d9d9d9] text-[#111827] transition duration-200 hover:bg-[#fafafa]"
                                        >
                                            Browse
                                        </button>

                                    </div>

                                </div>

                                {/* Empty State */}
                                {selectedProducts.length === 0 ? (

                                    <div className="flex h-[260px] flex-col items-center justify-center px-4 text-center">

                                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#f3f4f6]">

                                            <Tag
                                                size={22}
                                                className="text-[#9ca3af]"
                                            />

                                        </div>

                                        <h3 className="text-[14px] font-medium text-[#374151]">
                                            No products selected
                                        </h3>

                                        <p className="mt-1 text-[12px] text-[#9ca3af]">
                                            Search and add products to this group.
                                        </p>

                                    </div>

                                ) : (

                                    filteredSelectedProducts.length === 0 ? (

                                        <div className="flex h-[260px] flex-col items-center justify-center px-4 text-center">

                                            <Search
                                                size={24}
                                                className="mb-3 text-[#9ca3af]"
                                            />

                                            <h3 className="text-[14px] font-medium text-[#374151]">
                                                No matching products
                                            </h3>

                                            <p className="mt-1 text-[12px] text-[#9ca3af]">
                                                Try another search term.
                                            </p>

                                        </div>

                                    ) : (

                                        <DndContext
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                            autoScroll={false}
                                        >

                                            <SortableContext
                                                items={filteredSelectedProducts}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                <div className="max-h-[262px] overflow-y-auto p-3 [&::-webkit-scrollbar]:w-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#111827] [&::-webkit-scrollbar-thumb]:rounded-full">
                                                    <div className="space-y-2 p-3">

                                                        {filteredSelectedProducts.map((product) => (

                                                            <SortableProduct
                                                                key={product.id}
                                                                product={product}
                                                                selectedProducts={selectedProducts}
                                                                setSelectedProducts={setSelectedProducts}
                                                                errors={errors}
                                                                setErrors={setErrors}
                                                            />

                                                        ))}

                                                    </div>
                                                </div>

                                            </SortableContext>

                                        </DndContext>

                                    )

                                )}

                            </div>

                        </div>

                        {/* Right Side */}
                        {/* <div> */}

                        {/* <div className="rounded-[14px] border border-[#e5e7eb] bg-white p-4"> */}

                        {/* <h2 className="mb-3 text-[13px] font-medium text-[#111827]">
                                    Group Image
                                </h2> */}

                        {/* Upload Box */}
                        {/* <div className="relative overflow-hidden rounded-xl border border-dashed border-[#d1d5db] bg-[#fafafa]"> */}

                        {/* Image Preview */}
                        {/* {groupImage ? ( */}

                        {/* <img
                                            src={groupImage}
                                            alt="Group"
                                            className="h-[260px] w-full object-cover"
                                        /> */}

                        {/* ) : ( */}

                        {/* <div className="flex h-[260px] flex-col items-center justify-center px-4 text-center"> */}
                        {/* 
                                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm">

                                                <ImagePlus
                                                    size={22}
                                                    className="text-[#6b7280]"
                                                />

                                            </div> */}

                        {/* <h3 className="text-[14px] font-medium text-[#374151]">
                                                Upload Image
                                            </h3>

                                            <p className="mt-1 text-[12px] leading-relaxed text-[#9ca3af]">
                                                Add thumbnail for this product group.
                                            </p> */}

                        {/* </div> */}

                        {/* )} */}

                        {/* Hidden Input */}
                        {/* <input
                                        ref={fileInputRef}
                                        name="groupImage"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    /> */}

                        {/* Upload Button */}
                        {/* <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute bottom-4 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-lg bg-[#111827] px-4 py-2 text-[12px] font-medium text-white transition duration-200 hover:opacity-90 shadow-sm"
                                    >

                                        <Upload size={14} />

                                        {groupImage
                                            ? "Change Image"
                                            : "Upload"}

                                    </button> */}

                        {/* </div> */}
                        {/* {errors.image && (
                                    <div className="mt-3 flex items-center gap-2 text-[12px] text-red-700">
                                        <AlertCircle size={14} />
                                        <span>{errors.image}</span>
                                    </div>
                                )} */}

                        {/* </div> */}


                        {/* </div> */}

                    </div>

                </div>

                {/* MODAL */}
                {openModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3">

                        <div className="w-full max-w-[720px] overflow-hidden rounded-[14px] bg-white shadow-2xl">

                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-[#ececec] px-4 py-3">

                                <h2 className="text-[13px] font-semibold text-[#111827]">
                                    Add products
                                </h2>

                                <button
                                    type="button"
                                    onClick={() => setOpenModal(false)}
                                    className="cursor-pointer text-[#6b7280] transition duration-200 hover:text-black"
                                >
                                    <X size={18} />
                                </button>

                            </div>

                            {/* Search */}
                            <div className="border-b border-[#ececec] p-3">

                                <div className="flex h-[36px] items-center gap-2 rounded-lg border border-[#d9d9d9] px-3 transition duration-200 focus-within:border-black">

                                    <Search
                                        size={14}
                                        className="text-[#6b7280]"
                                    />

                                    <input
                                        type="text"
                                        placeholder="Search products"
                                        value={modalSearch}
                                        onChange={(e) => {
                                            setModalSearch(e.target.value)
                                        }}
                                        className="w-full text-[12px] outline-none"
                                    />

                                </div>

                            </div>

                            {/* Product List */}
                            <div className="h-[280px] overflow-y-auto" onScroll={handleModalScroll}>

                                {filteredProducts.length === 0 ? (

                                    <div className="flex h-full flex-col items-center justify-center p-8">

                                        <Search
                                            size={20}
                                            className="mb-3 text-[#374151]"
                                        />

                                        <h3 className="text-[13px] font-medium text-[#374151]">
                                            No products found
                                        </h3>

                                        <p className="mt-1 text-[12px] text-[#9ca3af]">
                                            Try another search term.
                                        </p>

                                    </div>

                                ) : (

                                    <>
                                        {visibleProducts.map((product: Product) => {

                                            const isSelected = tempSelected.some(
                                                (item) => item.id === product.id
                                            );

                                            const isAssigned =
                                                assignedProductIds?.includes(product.id);

                                            return (

                                                <div
                                                    key={product.id}
                                                    onClick={() => {

                                                        if (isAssigned) return;

                                                        toggleProduct(product);

                                                    }}
                                                    className={`flex items-center gap-3 border-b border-[#ececec] px-4 py-2.5 transition duration-200

                                                        ${isAssigned
                                                            ? "cursor-default bg-[#fafafa] opacity-50"
                                                            : isSelected
                                                                ? "bg-[#f4f4f5]"
                                                                : "cursor-pointer hover:bg-[#fafafa]"
                                                        }
                                                    `}
                                                >

                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        readOnly
                                                        className="h-4 w-4 cursor-pointer accent-black"
                                                    />

                                                    <img
                                                        src={product.image}
                                                        alt=""
                                                        className="h-[40px] w-[40px] rounded-lg border border-[#d9d9d9]"
                                                    />

                                                    <h3 className="text-[11px] font-medium uppercase text-[#111827]">
                                                        {product.name}
                                                    </h3>

                                                    {isAssigned && (

                                                        <span className="ml-auto rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-600">

                                                            Assigned to {
                                                                assignedProductMap?.[product.id]
                                                            }

                                                        </span>

                                                    )}

                                                </div>

                                            );

                                        })}

                                        {loadingMore && (

                                            <div className="flex justify-center py-4">

                                                <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#d9d9d9] border-t-[#111827]" />

                                            </div>

                                        )}
                                    </>


                                )}

                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-end gap-2 border-t border-[#ececec] px-4 py-3">

                                <button
                                    type="button"
                                    onClick={() => setOpenModal(false)}
                                    className="cursor-pointer rounded-lg border border-[#d9d9d9] px-3 py-1.5 text-[11px] font-medium transition duration-200 hover:bg-[#fafafa]"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    onClick={handleAddProducts}
                                    className="cursor-pointer rounded-lg bg-[#111827] px-3 py-1.5 text-[11px] font-medium text-white transition duration-200 hover:opacity-90"
                                >

                                    Add

                                </button>

                            </div>

                        </div>

                    </div>
                )}

            </div>
        </Form >
    );
}
