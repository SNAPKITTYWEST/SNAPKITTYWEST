# Lean FFI Bridge - Lean proof verification

add_library(pirtm-lean-ffi
    src/LeanFFI.cpp
)

target_include_directories(pirtm-lean-ffi
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-lean-ffi
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

if(PIRTM_BUILD_TESTS)
    add_executable(pirtm-lean-ffi-test
        test/test_lean_ffi.cpp
    )
    target_link_libraries(pirtm-lean-ffi-test
        PRIVATE
            pirtm-lean-ffi
    )
    add_test(NAME lean_ffi_test COMMAND pirtm-lean-ffi-test)
endif()
