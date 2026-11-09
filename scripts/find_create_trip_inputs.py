with open('templates/views/view_create_trip.html', 'r', encoding='utf-8') as f:
    for i, line in enumerate(f, 1):
        if any(k in line.lower() for k in ['nơi lấy', 'nơi đóng', 'nơi hạ', 'cảng / icd', 'kho kh', 'bãi rỗng']):
            print(f'{i}: {line.strip()[:100]}')
