# Contractivity Receipt - Mathematical soundness proofs

add_library(pirtm-contractivity
    src/ContractivityReceipt.cpp
)

target_include_directories(pirtm-contractivity
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-contractivity
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

if(PIRTM_BUILD_TESTS)
    add_executable(pirtm-contractivity-test
        test/test_contractivity.cpp
    )
    target_link_libraries(pirtm-contractivity-test
        PRIVATE
            pirtm-contractivity
    )
    add_test(NAME contractivity_test COMMAND pirtm-contractivity-test)
endif()
