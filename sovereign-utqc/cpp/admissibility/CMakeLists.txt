# Admissibility Validator - AST validation with WORM receipts

add_library(pirtm-admissibility
    src/AdmissibilityValidator.cpp
)

target_include_directories(pirtm-admissibility
    PUBLIC
        ${CMAKE_CURRENT_SOURCE_DIR}/include
)

target_link_libraries(pirtm-admissibility
    PRIVATE
        pirtm-contractivity
)

# Install headers
install(DIRECTORY include/ DESTINATION include)

# Install library
install(TARGETS pirtm-admissibility
    ARCHIVE DESTINATION lib
    LIBRARY DESTINATION lib
)

if(PIRTM_BUILD_TESTS)
    add_executable(pirtm-admissibility-test
        test/test_admissibility.cpp
    )
    target_link_libraries(pirtm-admissibility-test
        PRIVATE
            pirtm-admissibility
    )
    add_test(NAME admissibility_test COMMAND pirtm-admissibility-test)
endif()
