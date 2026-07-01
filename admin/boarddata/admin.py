from django.contrib import admin
from .models import AppUser, Category, Tag, Post, Conversation, Message, Quiz, QuizAttempt
# Register your models here.

class ReadOnlyAdmin(admin.ModelAdmin):
    """추가/수정 금지, 조회+삭제만 허용 (비즈니스 로직 우회 방지)"""
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
@admin.register(AppUser)
class AppUserAdmin(ReadOnlyAdmin):
    list_display = ('id', 'username', 'email', 'nickname', 'created_at')
    search_fields = ('username', 'email', 'nickname')

@admin.register(Category)
class CategoryAdmin(ReadOnlyAdmin):
    list_display = ('id', 'name', 'parent')
    search_fields = ('name',)

@admin.register(Tag)
class TagAdmin(ReadOnlyAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)
    
@admin.register(Post)
class PostAdmin(ReadOnlyAdmin):
    list_display = ('id', 'title', 'user', 'category', 'created_at', 'updated_at')
    list_filter = ('category',)
    search_fields = ('title',)

@admin.register(Conversation)
class ConversationAdmin(ReadOnlyAdmin):
    list_display = ('id', 'title', 'user', 'created_at')
    search_fields = ('title',)


@admin.register(Message)
class MessageAdmin(ReadOnlyAdmin):
    list_display = ('id', 'conversation', 'role', 'created_at')
    list_filter = ('role',)
    search_fields = ('content',)


@admin.register(Quiz)
class QuizAdmin(ReadOnlyAdmin):
    list_display = ('id', 'question', 'quiz_type', 'user', 'category', 'source_title', 'created_at')
    list_filter = ('quiz_type', 'category')
    search_fields = ('question',)


@admin.register(QuizAttempt)
class QuizAttemptAdmin(ReadOnlyAdmin):
    list_display = ('id', 'quiz', 'user', 'user_answer', 'is_correct', 'created_at')
    list_filter = ('is_correct',)