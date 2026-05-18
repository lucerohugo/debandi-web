import django_filters
from .models import Articulo, SubRubro


class ArticuloFilterSet(django_filters.FilterSet):
    """
    FilterSet personalizado para Articulo que soporta filtros múltiples separados por comas.
    
    Ejemplo: /articulos/?mar_codi=1,2,3&sru_codi__rub_codi=5,6&sru_codi=1,2
    """
    
    # Filtro personalizado para mar_codi que acepta listas separadas por comas
    mar_codi = django_filters.BaseInFilter(field_name='mar_codi')
    
    # Filtro personalizado para sru_codi que acepta listas separadas por comas
    sru_codi = django_filters.BaseInFilter(field_name='sru_codi')
    
    # Filtro personalizado para sru_codi__rub_codi que acepta listas separadas por comas
    sru_codi__rub_codi = django_filters.BaseInFilter(field_name='sru_codi__rub_codi')
    
    class Meta:
        model = Articulo
        fields = {
            'art_acti': ['exact'],
            'art_visw': ['exact'],
            'art_stk': ['exact', 'gt'],
            'art_pfin': ['exact', 'gte', 'lte'],
        }


class SubrubroFilterSet(django_filters.FilterSet):
    """
    FilterSet personalizado para SubRubro que soporta filtros múltiples separados por comas.
    
    Ejemplo: /subrubros/?rub_codi=1,2,3
    """
    
    # Filtro personalizado para rub_codi que acepta listas separadas por comas
    rub_codi = django_filters.BaseInFilter(field_name='rub_codi')
    
    class Meta:
        model = SubRubro
        fields = ['rub_codi']
