cmake_minimum_required(VERSION 3.20)
project(pirtm VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find LLVM/MLIR if available
find_package(LLVM QUIET)
find_package(MLIR QUIET)

if(LLVM_FOUND AND MLIR_FOUND)
    message(STATUS "LLVM found: ${LLVM_PACKAGE_VERSION}")
    message(STATUS "MLIR found: ${MLIR_PACKAGE_VERSION}")
    set(HAS_LLVM_MLIR TRUE)
else()
    message(WARNING "LLVM/MLIR not found - building without MLIR/LLVM support")
    set(HAS_LLVM_MLIR FALSE)
endif()

# Build options
option(PIRTM_BUILD_TESTS "Build tests" ON)
option(PIRTM_BUILD_MLIR "Build MLIR dialect" ${HAS_LLVM_MLIR})
option(PIRTM_BUILD_LLVM "Build LLVM lowering" ${HAS_LLVM_MLIR})

# Include directories
include_directories(${CMAKE_CURRENT_SOURCE_DIR})

# Add subdirectories
add_subdirectory(admissibility)
add_subdirectory(contractivity)
add_subdirectory(multiplicity)
add_subdirectory(sedona-spine)
add_subdirectory(zeno-finton)
add_subdirectory(lean-ffi)

if(PIRTM_BUILD_MLIR)
    add_subdirectory(pirtm-mlir)
endif()

if(PIRTM_BUILD_LLVM)
    add_subdirectory(pirtm-llvm)
endif()

# Summary
message(STATUS "")
message(STATUS "PIRTM Build Configuration:")
message(STATUS "  C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "  Build Tests: ${PIRTM_BUILD_TESTS}")
message(STATUS "  Build MLIR: ${PIRTM_BUILD_MLIR}")
message(STATUS "  Build LLVM: ${PIRTM_BUILD_LLVM}")
message(STATUS "")
