import requests
import unittest
import sys
from datetime import datetime

class F1APITester:
    def __init__(self, base_url="https://d3f189f7-17b0-4d83-8b8a-2c5c32709984.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0

    def run_test(self, name, endpoint, expected_status=200):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            response = requests.get(url)
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                return success, response.json()
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seasons_list(self):
        """Test the seasons list endpoint"""
        success, data = self.run_test("Seasons List", "/api/seasons")
        
        if success:
            # Verify we have seasons from 2005 to current year
            current_year = datetime.now().year
            expected_count = current_year - 2005 + 1
            
            if 'seasons' in data and len(data['seasons']) == expected_count:
                print(f"✅ Correct number of seasons: {len(data['seasons'])}")
                
                # Check first and last seasons
                first_season = data['seasons'][0]
                last_season = data['seasons'][-1]
                
                if first_season['year'] == 2005 and first_season['data_source'] == 'jolpica':
                    print("✅ First season (2005) is correct with jolpica data source")
                else:
                    print("❌ First season data is incorrect")
                
                if last_season['year'] == current_year and last_season['data_source'] == 'openf1':
                    print(f"✅ Last season ({current_year}) is correct with openf1 data source")
                else:
                    print(f"❌ Last season data is incorrect")
                
                return True
            else:
                print(f"❌ Incorrect number of seasons: {len(data.get('seasons', []))}, expected {expected_count}")
                return False
        
        return False

    def test_season_details(self, year):
        """Test the season details endpoint for a specific year"""
        success, data = self.run_test(f"Season Details ({year})", f"/api/seasons/{year}")
        
        if success:
            expected_source = "jolpica" if year <= 2022 else "openf1"
            
            if data.get('year') == year and data.get('data_source') == expected_source:
                print(f"✅ Season {year} has correct year and data source ({expected_source})")
                
                if 'races' in data and isinstance(data['races'], list):
                    print(f"✅ Season {year} has {len(data['races'])} races")
                    return True
                else:
                    print(f"❌ Season {year} missing races data")
            else:
                print(f"❌ Season {year} has incorrect metadata")
        
        return False

    def test_season_drivers(self, year):
        """Test the season drivers endpoint for a specific year"""
        success, data = self.run_test(f"Season Drivers ({year})", f"/api/seasons/{year}/drivers")
        
        if success:
            expected_source = "jolpica" if year <= 2022 else "openf1"
            
            if data.get('year') == year and data.get('data_source') == expected_source:
                print(f"✅ Drivers for {year} has correct year and data source ({expected_source})")
                
                if 'drivers' in data and isinstance(data['drivers'], list):
                    print(f"✅ Season {year} has {len(data['drivers'])} drivers")
                    
                    # Check driver data structure based on source
                    if data['drivers'] and expected_source == 'jolpica':
                        driver = data['drivers'][0]
                        if 'givenName' in driver and 'familyName' in driver:
                            print(f"✅ Driver data structure is correct for jolpica source")
                            return True
                    elif data['drivers'] and expected_source == 'openf1':
                        driver = data['drivers'][0]
                        if 'full_name' in driver or 'driver_number' in driver:
                            print(f"✅ Driver data structure is correct for openf1 source")
                            return True
                    
                    print(f"❌ Driver data structure is incorrect")
                else:
                    print(f"❌ Season {year} missing drivers data")
            else:
                print(f"❌ Drivers for {year} has incorrect metadata")
        
        return False

    def test_season_constructors(self, year):
        """Test the season constructors endpoint for a specific year"""
        success, data = self.run_test(f"Season Constructors ({year})", f"/api/seasons/{year}/constructors")
        
        if success:
            expected_source = "jolpica" if year <= 2022 else "openf1"
            
            if data.get('year') == year and data.get('data_source') == expected_source:
                print(f"✅ Constructors for {year} has correct year and data source ({expected_source})")
                
                if 'constructors' in data and isinstance(data['constructors'], list):
                    print(f"✅ Season {year} has {len(data['constructors'])} constructors/teams")
                    
                    # Check constructor data structure based on source
                    if data['constructors'] and expected_source == 'jolpica':
                        constructor = data['constructors'][0]
                        if 'name' in constructor and 'nationality' in constructor:
                            print(f"✅ Constructor data structure is correct for jolpica source")
                            return True
                    elif data['constructors'] and expected_source == 'openf1':
                        constructor = data['constructors'][0]
                        if 'name' in constructor and ('team_colour' in constructor or 'nationality' in constructor):
                            print(f"✅ Constructor data structure is correct for openf1 source")
                            return True
                    
                    print(f"❌ Constructor data structure is incorrect")
                else:
                    print(f"❌ Season {year} missing constructors data")
            else:
                print(f"❌ Constructors for {year} has incorrect metadata")
        
        return False

    def test_race_details(self, year, round_num):
        """Test the race details endpoint for a specific race"""
        success, data = self.run_test(f"Race Details ({year}, Round {round_num})", f"/api/races/{year}/{round_num}")
        
        if success:
            expected_source = "jolpica" if year <= 2022 else "openf1"
            
            if data.get('year') == year and data.get('round') == round_num and data.get('data_source') == expected_source:
                print(f"✅ Race details for {year} Round {round_num} has correct metadata")
                
                if 'race_data' in data:
                    print(f"✅ Race data is present")
                    return True
                else:
                    print(f"❌ Race data is missing")
            else:
                print(f"❌ Race details has incorrect metadata")
        
        return False

def main():
    print("=" * 50)
    print("F1 Race Data API Test Suite")
    print("=" * 50)
    
    # Initialize tester with the public endpoint
    tester = F1APITester()
    
    # Test seasons list
    seasons_ok = tester.test_seasons_list()
    
    # Test different years for season details
    historical_year = 2005  # First historical year
    mid_year = 2015         # Middle historical year
    modern_year = 2024      # Modern year
    
    # Test season details
    historical_details_ok = tester.test_season_details(historical_year)
    mid_details_ok = tester.test_season_details(mid_year)
    modern_details_ok = tester.test_season_details(modern_year)
    
    # Test drivers
    historical_drivers_ok = tester.test_season_drivers(historical_year)
    mid_drivers_ok = tester.test_season_drivers(mid_year)
    modern_drivers_ok = tester.test_season_drivers(modern_year)
    
    # Test constructors
    historical_constructors_ok = tester.test_season_constructors(historical_year)
    mid_constructors_ok = tester.test_season_constructors(mid_year)
    modern_constructors_ok = tester.test_season_constructors(modern_year)
    
    # Test race details (assuming round 1 exists for all seasons)
    historical_race_ok = tester.test_race_details(historical_year, 1)
    mid_race_ok = tester.test_race_details(mid_year, 1)
    modern_race_ok = tester.test_race_details(modern_year, 1)
    
    # Print summary
    print("\n" + "=" * 50)
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {tester.tests_passed/tester.tests_run*100:.1f}%")
    print("=" * 50)
    
    # Return success if all critical tests passed
    critical_tests = [
        seasons_ok,
        historical_details_ok, modern_details_ok,
        historical_drivers_ok, modern_drivers_ok,
        historical_constructors_ok, modern_constructors_ok
    ]
    
    return 0 if all(critical_tests) else 1

if __name__ == "__main__":
    sys.exit(main())
