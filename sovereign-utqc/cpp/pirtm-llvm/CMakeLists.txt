# PIRTM LLVM Lowering - MLIR to LLVM/WASM lowering

if(NOT PIRTM_BUILD_LLVM)
    message(STATUS "Skipping pirtm-llvm (LLVM not enabled)")
    return()
endif()

# Find MLIR packages
find_package(MLIR REQUIRED CONFIG)
find_package(LLVM REQUIRED CONFIG)

message(STATUS "Using MLIR in: ${MLIR_DIR}")
message(STATUS "Using LLVM in: ${LLVM_DIR}")

list(APPEND CMAKE_MODULE_PATH "${MLIR_CMAKE_DIR}")
list(APPEND CMAKE_MODULE_PATH "${LLVM_CMAKE_DIR}")

include(TableGen)
include(AddLLVM)
include(AddMLIR)
include(HandleLLVMOptions)

include_directories(${LLVM_INCLUDE_DIRS})
include_directories(${MLIR_INCLUDE_DIRS})

# LLVM lowering library
add_library(pirtm-llvm-lowering
    src/PirtmLowering.cpp
)

target_include_directories(pirtm-llvm-lowering
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(pirtm-llvm-lowering
    PUBLIC
        MLIRIR
        MLIRPass
        MLIRSupport
        LLVMCore
        LLVMSupport
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-llvm-lowering
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)
