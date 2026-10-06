def test_health_router_module_imports():
    from service_kit.observability import create_health_router

    assert callable(create_health_router)
