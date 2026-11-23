// {/* <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">

//     <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-2xl">

//         {/* Spinner */}
//         <div className="h-12 w-12 animate-spin rounded-full border-[4px] border-[#e5e7eb] border-t-black" />

//         {/* Text */}
//         <p className="text-[14px] font-medium text-[#111827]">

//             Saving Product Group...

//         </p>

//     </div>

// </div> */}


export default function GlobalLoader({
    text = "Loading...",
}: {
    text?: string;
}) {

    return (

        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">

            <div className="flex flex-col items-center gap-4 rounded-2xl bg-white px-8 py-6 shadow-2xl">

                {/* Spinner */}
                <div className="h-12 w-12 animate-spin rounded-full border-[4px] border-[#e5e7eb] border-t-black" />

                {/* Text */}
                <p className="text-[14px] font-medium text-[#111827]">

                    {text}

                </p>

            </div>

        </div>

    );
}