document.addEventListener('DOMContentLoaded', function() {
    // API 키 설정 (실제 발급받은 키로 변경 필요)
    const API_KEY = 'bdf2df7436774927a79ff063c88b50fd';
    
    // 오늘 날짜 설정
    const today = new Date();
    const dateInput = document.getElementById('mealDate');
    dateInput.valueAsDate = today;
    
    // 이벤트 리스너 설정
    document.getElementById('searchButton').addEventListener('click', searchSchool);
    document.getElementById('prevDay').addEventListener('click', () => changeDate(-1));
    document.getElementById('nextDay').addEventListener('click', () => changeDate(1));
    dateInput.addEventListener('change', fetchMeal);
    
    // 날짜 변경 함수
    function changeDate(days) {
        const currentDate = new Date(dateInput.value);
        currentDate.setDate(currentDate.getDate() + days);
        dateInput.valueAsDate = currentDate;
        fetchMeal();
    }
    
    // 학교 검색 함수
    function searchSchool() {
        const eduOfficeCode = document.getElementById('eduOfficeCode').value;
        const schoolName = document.getElementById('schoolName').value;
        
        if (!eduOfficeCode || !schoolName) {
            alert('교육청과 학교명을 모두 입력해주세요.');
            return;
        }
        
        const resultsContainer = document.getElementById('schoolSearchResults');
        resultsContainer.innerHTML = '<p>검색 중...</p>';
        
        // NEIS API 학교 정보 검색 엔드포인트
        const url = `https://open.neis.go.kr/hub/schoolInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${eduOfficeCode}&SCHUL_NM=${encodeURIComponent(schoolName)}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                if (data.RESULT) {
                    resultsContainer.innerHTML = '<p>검색 결과가 없습니다.</p>';
                    return;
                }
                
                const schools = data.schoolInfo[1].row;
                let html = '<ul class="school-list">';
                
                schools.forEach(school => {
                    html += `
                        <li class="school-item" data-edu-code="${school.ATPT_OFCDC_SC_CODE}" data-school-code="${school.SD_SCHUL_CODE}">
                            <strong>${school.SCHUL_NM}</strong> (${school.LCTN_SC_NM})
                        </li>
                    `;
                });
                
                html += '</ul>';
                resultsContainer.innerHTML = html;
                
                // 학교 선택 이벤트 추가
                document.querySelectorAll('.school-item').forEach(item => {
                    item.addEventListener('click', function() {
                        const eduCode = this.dataset.eduCode;
                        const schoolCode = this.dataset.schoolCode;
                        
                        // 선택된 학교 정보 저장 (localStorage 활용)
                        localStorage.setItem('selectedEduCode', eduCode);
                        localStorage.setItem('selectedSchoolCode', schoolCode);
                        localStorage.setItem('selectedSchoolName', this.querySelector('strong').textContent);
                        
                        // 급식 정보 가져오기
                        fetchMeal();
                    });
                });
            })
            .catch(error => {
                console.error('학교 검색 오류:', error);
                resultsContainer.innerHTML = '<p>학교 검색 중 오류가 발생했습니다.</p>';
            });
    }
    
    // 급식 정보 가져오기 함수
    function fetchMeal() {
        const eduCode = localStorage.getItem('selectedEduCode');
        const schoolCode = localStorage.getItem('selectedSchoolCode');
        const schoolName = localStorage.getItem('selectedSchoolName');
        
        if (!eduCode || !schoolCode) {
            document.getElementById('mealInfo').innerHTML = '<p>먼저 학교를 검색하고 선택해주세요.</p>';
            return;
        }
        
        const date = dateInput.value.replace(/-/g, '');
        const mealContainer = document.getElementById('mealInfo');
        mealContainer.innerHTML = '<p>급식 정보를 가져오는 중...</p>';
        
        // NEIS API 급식 정보 조회 엔드포인트
        const url = `https://open.neis.go.kr/hub/mealServiceDietInfo?KEY=${API_KEY}&Type=json&ATPT_OFCDC_SC_CODE=${eduCode}&SD_SCHUL_CODE=${schoolCode}&MLSV_YMD=${date}`;
        
        fetch(url)
            .then(response => response.json())
            .then(data => {
                mealContainer.innerHTML = '';
                
                if (data.RESULT && data.RESULT.CODE === 'INFO-200') {
                    mealContainer.innerHTML = `<p>${schoolName} ${formatDate(date)} 급식 정보가 없습니다.</p>`;
                    return;
                }
                
                const meals = data.mealServiceDietInfo[1].row;
                
                meals.forEach(meal => {
                    // 메뉴에서 영양소 정보 및 불필요한 기호 제거
                    const cleanMenu = meal.DDISH_NM
                        .replace(/\([0-9\.]+\)/g, '') // 영양소 정보 제거
                        .replace(/<br\s*\/?>/g, '\n') // <br> 태그를 줄바꿈으로 변환
                        .trim();
                    
                    const mealType = getMealTypeName(meal.MMEAL_SC_CODE);
                    
                    const mealEl = document.createElement('div');
                    mealEl.className = 'meal-item';
                    mealEl.innerHTML = `
                        <div class="meal-type">${mealType}</div>
                        <div class="meal-menu">${cleanMenu}</div>
                        <div class="meal-cal">칼로리: ${meal.CAL_INFO}</div>
                    `;
                    
                    mealContainer.appendChild(mealEl);
                });
            })
            .catch(error => {
                console.error('급식 정보 가져오기 오류:', error);
                mealContainer.innerHTML = '<p>급식 정보를 가져오는 중 오류가 발생했습니다.</p>';
            });
    }
    
    // 급식 유형 이름 변환 함수
    function getMealTypeName(code) {
        switch (code) {
            case '1': return '아침';
            case '2': return '점심';
            case '3': return '저녁';
            default: return '급식';
        }
    }
    
    // 날짜 포맷 함수
    function formatDate(dateStr) {
        const year = dateStr.substring(0, 4);
        const month = dateStr.substring(4, 6);
        const day = dateStr.substring(6, 8);
        return `${year}년 ${month}월 ${day}일`;
    }
});