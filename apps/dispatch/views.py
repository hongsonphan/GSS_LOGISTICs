from django.shortcuts import render

def index_view(request):
    """Giao diện Quản trị Điều vận Bim Logistics."""
    return render(request, 'index.html')
