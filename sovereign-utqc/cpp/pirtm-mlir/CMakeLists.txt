# PIRTM MLIR Dialect - requires MLIR

if(NOT PIRTM_BUILD_MLIR)
    message(STATUS "Skipping pirtm-mlir (MLIR not enabled)")
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

# MLIR dialect library (placeholder - needs TableGen .td files)
add_library(pirtm-mlir-dialect
    lib/Dialect/PirtmDialect.cpp
)

target_include_directories(pirtm-mlir-dialect
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(pirtm-mlir-dialect
    PUBLIC
        MLIRIR
        MLIRPass
        MLIRSupport
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-mlir-dialect
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)
