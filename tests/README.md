# Tests

Automated tests for the ZET Zagreb transit app.

## Test Suites

### `test_functional_requirements.py`

Validates all 5 functional requirements and measures data fetch sizes (the main bottleneck).

**Run tests:**
```bash
python3 tests/test_functional_requirements.py
```

**What it tests:**

#### A1: Routes at Stop
- ✅ Validates `stops/{id}.json` structure
- 📊 Measures file size (~10 KB)
- ✅ Verifies route list is returned

#### A2: Timetables at Stop (Optimized)
- ✅ Validates `stop_timetables/{id}.json` structure
- 📊 Measures file size (~100 KB vs 570 KB baseline)
- ✅ Confirms 82% reduction in fetch size
- ✅ Verifies trip data format

#### A3: Draw Routes at Stop
- ✅ Validates `shapes/{id}.json` structure
- 📊 Measures total size for all route shapes (~90 KB)
- ✅ Verifies geographic path data

#### B1: Vehicle Positions (Optimized)
- ✅ Validates `route_active_trips/{id}.json` structure
- 📊 Measures file size (~252 KB vs 1,208 KB baseline)
- ✅ Confirms 79% reduction in fetch size
- ✅ Verifies trip metadata and embedded shapes

#### B2: Stops on Route (Optimized)
- ✅ Validates `route_stops/{id}.json` structure
- 📊 Measures file size (~650 bytes vs 190 KB baseline)
- ✅ Confirms 99.7% reduction (301x smaller)
- ✅ Verifies stop list

#### Initial Load
- ✅ Validates `initial.json` structure
- 📊 Measures file size (~456 KB)
- ✅ Verifies app startup data (stops, routes, calendar)

## Test Results

```
======================================================================
SUMMARY: DATA FETCH SIZES
======================================================================

📊 FUNCTIONAL REQUIREMENTS COMPARISON:
──────────────────────────────────────────────────────────────────────
A1: Routes at stop             →     10,029 bytes (    9.8 KB)
A2: Timetables at stop         →    103,050 bytes (  100.6 KB)
A3: Draw routes                →     91,436 bytes (   89.3 KB)
B1: Vehicle positions          →    257,762 bytes (  251.7 KB)
B2: Stops on route             →        646 bytes (    0.6 KB)
──────────────────────────────────────────────────────────────────────
TOTAL (all requirements)       →    462,923 bytes (  452.1 KB)

🎯 OPTIMIZATION RESULTS:
  A1: ✅ Easy   - ~10 KB (ready)
  A2: ✅ Easy   - ~100 KB (82% reduction)
  A3: 🟡 OK     - ~90 KB (multiple fetches accepted)
  B1: ✅ Easy   - ~252 KB (79% reduction, 1 fetch)
  B2: ✅ Easy   - ~650 bytes (99.7% reduction)

✅ ALL OPTIMIZATIONS WORKING
======================================================================
```

## Adding New Tests

To add new functional requirement tests:

1. Create a new test method in `TestFunctionalRequirements` class
2. Measure file sizes using `self.get_file_size(path)`
3. Load and validate JSON using `self.load_json(path)`
4. Compare against baseline or expected thresholds
5. Print results for visibility

Example:
```python
def test_new_requirement(self):
    """Test description."""
    print("\n" + "="*70)
    print("NEW REQUIREMENT")
    print("="*70)
    
    file_path = self.data_dir / 'some_file.json'
    file_size = self.get_file_size(file_path)
    data = self.load_json(file_path)
    
    print(f"📊 Size: {file_size:,} bytes ({file_size/1024:.1f} KB)")
    
    # Assertions
    self.assertLess(file_size, 100000, "File should be < 100 KB")
    self.assertIn('expected_field', data)
    
    print(f"✅ PASS")
```

## CI/CD Integration

These tests can be integrated into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run functional tests
  run: python3 tests/test_functional_requirements.py
```

For production builds, ensure data files are generated before running tests:
```bash
python3 scripts/process_gtfs.py
python3 tests/test_functional_requirements.py
```
