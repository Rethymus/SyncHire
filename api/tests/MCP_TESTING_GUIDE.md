# MCP Client Testing Guide

## Test Suite Overview

This document provides comprehensive guidance for testing the MCP (Model Context Protocol) client integration in the SyncHire platform.

## Test Files

### 1. Unit Tests (`test_mcp_client.py`)
**Status**: ✅ All 23 tests passing

Comprehensive unit tests covering:
- Client initialization and configuration
- All MCP tool calling methods
- HTTP client integration
- Request validation
- Performance characteristics
- Concurrent request handling

**Running Unit Tests**:
```bash
cd api
python -m pytest tests/test_mcp_client.py -v
```

### 2. Integration Tests (`test_mcp_integration.py`)
**Status**: 10/20 tests passing

End-to-end integration tests covering:
- Complete workflow scenarios
- Error recovery mechanisms
- Database integration
- Real-world usage patterns
- Performance and security

**Running Integration Tests**:
```bash
cd api
python -m pytest tests/test_mcp_integration.py -v
```

### 3. Mock Server Helpers (`mcp_mocks.py`)
Mock implementations of MCP servers for testing:
- MockResumeAnalyzerServer
- MockJDParserServer
- MockJobMatcherServer
- MockInterviewPrepServer

### 4. Test Configuration (`conftest.py`)
Enhanced pytest fixtures and configuration:
- MCP-specific fixtures
- Sample data generators
- Performance thresholds
- Mock response templates

## Test Coverage Summary

### ✅ Fully Tested Areas
- **Resume Parsing**: Successful parsing, file content handling
- **JD Parsing**: Structured data extraction
- **Job Matching**: Score calculation, match analysis
- **Interview Prep**: Question generation, structure validation
- **Resume Optimization**: Suggestions, ATS scoring
- **HTTP Integration**: URL construction, payload handling
- **Performance**: Response times, concurrent requests
- **Request Validation**: Parameter validation

### 🔄 Partially Tested Areas
- **Error Recovery**: Framework in place, needs actual MCP servers
- **Database Integration**: Tests written, need database setup
- **API Integration**: Framework ready, needs FastAPI setup
- **Security**: Basic tests passing, needs more comprehensive coverage

## Test Categories

### Unit Tests (23 tests)
```
TestMCPClientInitialization (2 tests)
├── test_client_initialization ✅
└── test_singleton_instance ✅

TestMCPClientResumeParsing (2 tests)
├── test_parse_resume_success ✅
└── test_parse_resume_with_file_content ✅

TestMCPClientJDParsing (2 tests)
├── test_parse_jd_success ✅
└── test_parse_jd_structured_extraction ✅

TestMCPClientJobMatching (2 tests)
├── test_match_resume_to_jd_success ✅
└── test_match_score_calculation ✅

TestMCPClientInterviewPrep (2 tests)
├── test_generate_interview_prep_success ✅
└── test_interview_questions_structure ✅

TestMCPClientResumeOptimization (2 tests)
├── test_optimize_resume_success ✅
└── test_optimize_resume_suggestions ✅

TestMCPClientErrorHandling (1 test)
└── test_mcp_error_exception_type ✅

TestMCPClientRequestValidation (2 tests)
├── test_parse_resume_requires_file_path ✅
└── test_parse_jd_requires_content ✅

TestMCPClientHTTPIntegration (3 tests)
├── test_http_client_timeout_configuration ✅
├── test_http_client_url_construction ✅
└── test_http_client_json_payload ✅

TestMCPClientPerformance (5 tests)
├── test_parse_resume_performance ✅
├── test_parse_jd_performance ✅
├── test_match_performance ✅
├── test_interview_prep_performance ✅
└── test_concurrent_requests ✅
```

### Integration Tests (20 tests, 10 passing)
```
TestMCPClientEndToEndWorkflows (2/2 passing)
├── test_complete_job_application_workflow ✅
└── test_workflow_with_low_match_score ✅

TestMCPClientErrorRecovery (0/4 passing)
├── test_resume_parsing_fallback_to_manual ❌
├── test_jd_parsing_fallback_to_regex ❌
├── test_retry_mechanism_on_transient_failure ❌
└── test_circuit_breaker_on_continuous_failures ❌

TestMCPClientWithDatabase (0/2 passing)
├── test_save_parsed_resume_to_database ❌
└── test_save_match_results_to_database ❌

TestMCPClientRealWorldScenarios (2/3 passing)
├── test_bulk_jd_parsing ✅
├── test_multi_resume_application ❌
└── test_resume_optimization_iteration ✅

TestMCPClientAPIIntegration (0/2 passing)
├── test_api_endpoint_parse_resume ❌
└── test_api_endpoint_error_handling ❌

TestMCPClientDataConsistency (1/2 passing)
├── test_resume_data_consistency ❌
└── test_jd_data_consistency ✅

TestMCPClientPerformanceIntegration (2/2 passing)
├── test_full_workflow_performance ✅
└── test_concurrent_workflow_performance ✅

TestMCPClientSecurity (3/3 passing)
├── test_sensitive_data_sanitization ✅
├── test_injection_attack_prevention ✅
└── test_rate_limiting ✅
```

## Performance Thresholds

All performance tests must meet these thresholds:
- **Resume Parsing**: < 5.0 seconds
- **JD Parsing**: < 3.0 seconds
- **Job Matching**: < 5.0 seconds
- **Interview Prep**: < 5.0 seconds
- **Resume Optimization**: < 5.0 seconds
- **Full Workflow**: < 18.0 seconds (combined)

## Running Tests

### All MCP Tests
```bash
cd api
python -m pytest tests/test_mcp*.py -v
```

### Unit Tests Only
```bash
cd api
python -m pytest tests/test_mcp_client.py -v
```

### Integration Tests Only
```bash
cd api
python -m pytest tests/test_mcp_integration.py -v
```

### Performance Tests Only
```bash
cd api
python -m pytest tests/test_mcp_client.py::TestMCPClientPerformance -v
python -m pytest tests/test_mcp_integration.py::TestMCPClientPerformanceIntegration -v
```

### With Coverage Report
```bash
cd api
python -m pytest tests/test_mcp_client.py --cov=app/services/mcp_client --cov-report=html
```

### Specific Test Categories
```bash
# Unit tests only
python -m pytest tests/test_mcp_client.py -m unit -v

# Integration tests only
python -m pytest tests/test_mcp_integration.py -m integration -v

# Performance tests only
python -m pytest tests/test_mcp_client.py -m performance -v

# MCP tests only
python -m pytest tests/test_mcp_integration.py -m mcp -v
```

## Test Fixtures

### Available MCP Fixtures
- `sample_resume_data`: Realistic resume data for testing
- `sample_jd_data`: Realistic job description data
- `mock_mcp_resume_response`: Mock resume parsing response
- `mock_mcp_jd_response`: Mock JD parsing response
- `mock_mcp_match_response`: Mock job matching response
- `mock_mcp_interview_prep_response`: Mock interview prep response
- `mock_mcp_optimize_response`: Mock resume optimization response
- `performance_thresholds`: Performance testing thresholds

### Using Mock Servers
```python
from tests.mcp_mocks import MockMCPServerFactory

# Create a mock server
server = MockMCPServerFactory.create_server("resume-analyzer")
result = server.parse_resume("/path/to/resume.pdf")

# Create all servers
all_servers = MockMCPServerFactory.create_all_servers()
```

## Debugging Failed Tests

### Verbose Output
```bash
python -m pytest tests/test_mcp_client.py -v -s
```

### Show Local Variables
```bash
python -m pytest tests/test_mcp_client.py -l
```

### Stop on First Failure
```bash
python -m pytest tests/test_mcp_client.py -x
```

### Enter Debugger on Failure
```bash
python -m pytest tests/test_mcp_client.py --pdb
```

### Detailed Traceback
```bash
python -m pytest tests/test_mcp_client.py --tb=long
```

## Continuous Integration

### GitHub Actions
Tests are configured to run in CI/CD pipelines:
- Unit tests run on every push
- Integration tests run on PR creation
- Performance tests run nightly

### Local Pre-commit
```bash
# Run tests before committing
cd api
python -m pytest tests/test_mcp_client.py -q
```

## Best Practices

### Writing New Tests
1. **Use proper fixtures**: Leverage existing fixtures for consistency
2. **Mock external dependencies**: Use mock servers, not real MCP servers
3. **Test edge cases**: Include boundary conditions and error scenarios
4. **Performance awareness**: Ensure tests meet performance thresholds
5. **Clear assertions**: Use descriptive assertion messages

### Test Organization
- **Unit tests**: Test individual methods in isolation
- **Integration tests**: Test complete workflows
- **Performance tests**: Validate response times and resource usage
- **Security tests**: Verify input validation and error handling

### Mock Strategy
- **Always mock** HTTP calls to external MCP servers
- **Use realistic** mock responses that match actual MCP server behavior
- **Test both** success and failure scenarios
- **Validate** request parameters and response handling

## Known Issues and Limitations

### Integration Test Limitations
Some integration tests fail because they require:
- Actual MCP servers running
- Database connection setup
- FastAPI application context
- Real file system access

### Error Handling Tests
Error handling tests are simplified because:
- Mocking httpx error scenarios is complex
- The MCP client's error handling is verified through code review
- Integration tests will catch real error scenarios

## Future Improvements

### Short Term
- Fix failing integration tests with proper mocking
- Add more edge case tests
- Increase performance test coverage
- Add more security tests

### Long Term
- Set up actual MCP servers for integration testing
- Implement end-to-end testing with real services
- Add load testing for high-concurrency scenarios
- Implement automated performance regression detection

## Contributing

When adding new MCP functionality:
1. Write unit tests first
2. Add integration tests for workflows
3. Update performance thresholds if needed
4. Document new fixtures in conftest.py
5. Update this testing guide

## Support

For questions or issues with MCP testing:
- Check existing test patterns in `test_mcp_client.py`
- Review mock server implementations in `mcp_mocks.py`
- Consult fixture definitions in `conftest.py`
- Review MCP client implementation in `app/services/mcp_client.py`
